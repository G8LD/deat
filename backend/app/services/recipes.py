"""Helpers for recipes.

Recipes are cached in Redis (`recipe:{id}`) with a 7-day TTL and promoted to
Postgres (hot columns + full Spoonacular payload in a `raw` JSONB column) ONLY
when attached to a user's menu. When unlinked from all menus or when menus are
deleted, unlinked recipes are removed from Postgres.
"""

import json
import logging
from typing import Any

import redis
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import Session, select

from app.core.redis import cache_get, cache_set, redis_client
from app.models.ingredients import Ingredient, RecipeDB, RecipeIngredient
from app.models.models import get_datetime_utc
from app.models.recipes import IngredientItem, Recipe, SearchResult
from app.services.recipes_api import RecipesAPI

logger = logging.getLogger(__name__)

# Redis keys / TTLs for search caching, recipe caching, and daily suggestions.
SEARCH_CACHE_PREFIX = "search"
SEARCH_CACHE_TTL = 60 * 60 * 24  # 1 day

RECIPE_CACHE_PREFIX = "recipe"
RECIPE_CACHE_TTL = 7 * 24 * 3600  # 7 days
RECIPES_IDS_SET = "recipes:ids"

SUGGESTIONS_DAILY_KEY = "suggestions:daily"
SUGGESTIONS_DAILY_TTL = 24 * 3600  # 24 hours


# ---------------------------------------------------------------------------
# Redis caching helpers
# ---------------------------------------------------------------------------


def _recipe_cache_key(recipe_id: int) -> str:
    return f"{RECIPE_CACHE_PREFIX}:{recipe_id}"


def cache_recipe_in_redis(recipe: Recipe, ttl: int = RECIPE_CACHE_TTL) -> None:
    """Cache a single recipe in Redis and add its id to the known ids set."""
    try:
        redis_client.set(
            _recipe_cache_key(recipe.id), recipe.model_dump_json(), ex=ttl
        )
        redis_client.sadd(RECIPES_IDS_SET, recipe.id)
    except redis.RedisError as exc:
        logger.warning("Redis cache recipe failed: %s", exc)


def cache_recipes_in_redis(recipes: list[Recipe], ttl: int = RECIPE_CACHE_TTL) -> None:
    """Batch-cache recipes in Redis and add their ids to the known ids set."""
    if not recipes:
        return
    try:
        pipeline = redis_client.pipeline()
        for r in recipes:
            pipeline.set(_recipe_cache_key(r.id), r.model_dump_json(), ex=ttl)
        pipeline.sadd(RECIPES_IDS_SET, *[r.id for r in recipes])
        pipeline.execute()
    except redis.RedisError as exc:
        logger.warning("Redis batch cache recipes failed: %s", exc)


def get_recipe_from_redis(recipe_id: int) -> Recipe | None:
    """Retrieve a single recipe from Redis by id."""
    try:
        raw = redis_client.get(_recipe_cache_key(recipe_id))
        if raw:
            return Recipe.model_validate_json(raw)
    except (redis.RedisError, ValidationError) as exc:
        logger.warning("Redis get recipe failed: %s", exc)
    return None


def get_recipes_from_redis(recipe_ids: set[int] | list[int]) -> dict[int, Recipe]:
    """Retrieve multiple recipes from Redis by id."""
    if not recipe_ids:
        return {}
    id_list = list(recipe_ids)
    keys = [_recipe_cache_key(rid) for rid in id_list]
    found: dict[int, Recipe] = {}
    try:
        cached_values = redis_client.mget(keys)
        for rid, val in zip(id_list, cached_values, strict=False):
            if val:
                try:
                    found[rid] = Recipe.model_validate_json(val)
                except ValidationError:
                    continue
    except redis.RedisError as exc:
        logger.warning("Redis mget recipes failed: %s", exc)
    return found


# ---------------------------------------------------------------------------
# Persistence (upsert & orphan cleanup)
# ---------------------------------------------------------------------------


def _recipe_columns(recipe: Recipe) -> dict[str, Any]:
    """Map a Spoonacular Recipe onto RecipeDB hot columns + raw payload."""
    now = get_datetime_utc()
    return {
        "id": recipe.id,
        "title": recipe.title,
        "image_type": recipe.imageType,
        "ready_in_minutes": recipe.readyInMinutes,
        "servings": recipe.servings,
        "health_score": recipe.healthScore,
        "source_url": recipe.sourceUrl,
        "summary": recipe.summary,
        "raw": recipe.model_dump(mode="json"),
        "updated_at": now,
        "fetched_at": now,
    }


def upsert_recipe(session: Session, recipe: Recipe) -> None:
    """Insert or update a recipe and its ingredients + links in Postgres."""
    cols = _recipe_columns(recipe)
    stmt = pg_insert(RecipeDB).values(**cols)
    stmt = stmt.on_conflict_do_update(
        index_elements=[RecipeDB.id],
        set_={k: v for k, v in cols.items() if k not in ("id", "created_at")},
    )
    session.exec(stmt)  # type: ignore[call-overload]

    for item in recipe.extendedIngredients:
        _upsert_ingredient(session, item)
        _upsert_recipe_ingredient(session, recipe.id, item)
    session.commit()


def _upsert_ingredient(session: Session, item: IngredientItem) -> None:
    values = {
        "id": item.id,
        "name": item.name,
        "name_clean": item.nameClean,
        "aisle": item.aisle,
        "image": item.image,
    }
    # Don't overwrite CSV-seeded possible_units / name with nulls on conflict.
    update = {k: v for k, v in values.items() if k != "id" and v is not None}
    stmt = pg_insert(Ingredient).values(**values)
    if update:
        stmt = stmt.on_conflict_do_update(index_elements=[Ingredient.id], set_=update)
    else:
        stmt = stmt.on_conflict_do_nothing(index_elements=[Ingredient.id])
    session.exec(stmt)  # type: ignore[call-overload]


def _upsert_recipe_ingredient(
    session: Session, recipe_id: int, item: IngredientItem
) -> None:
    values = {
        "recipe_id": recipe_id,
        "ingredient_id": item.id,
        "amount": item.measures.metric.amount
        if item.measures and item.measures.metric
        else item.amount,
        "unit": item.measures.metric.unitShort
        if item.measures and item.measures.metric
        else item.unit,
        "original": item.original,
        "measures": item.measures.model_dump(mode="json") if item.measures else None,
    }
    stmt = pg_insert(RecipeIngredient).values(**values)
    stmt = stmt.on_conflict_do_update(
        index_elements=[
            RecipeIngredient.recipe_id,
            RecipeIngredient.ingredient_id,
        ],
        set_={
            k: v for k, v in values.items() if k not in ("recipe_id", "ingredient_id")
        },
    )
    session.exec(stmt)  # type: ignore[call-overload]


def cleanup_orphaned_recipes(
    session: Session, candidate_ids: set[int] | None = None
) -> int:
    """Delete recipes from Postgres that are no longer linked to any menu.

    If candidate_ids is provided, only inspects those recipe IDs.
    Returns the number of deleted recipes.
    """
    from app.models.menus import MenuRecipe

    stmt = select(RecipeDB.id)
    if candidate_ids is not None:
        if not candidate_ids:
            return 0
        stmt = stmt.where(RecipeDB.id.in_(candidate_ids))  # type: ignore[attr-defined]

    linked_subquery = select(MenuRecipe.recipe_id).distinct()
    stmt = stmt.where(RecipeDB.id.not_in(linked_subquery))  # type: ignore[attr-defined]

    orphaned_ids = session.exec(stmt).all()
    if not orphaned_ids:
        return 0

    del_stmt = delete(RecipeDB).where(RecipeDB.id.in_(orphaned_ids))  # type: ignore[attr-defined]
    session.exec(del_stmt)  # type: ignore[call-overload]
    session.commit()
    return len(orphaned_ids)


# ---------------------------------------------------------------------------
# Read (Postgres -> Redis -> API)
# ---------------------------------------------------------------------------


def _is_usable(db_recipe: RecipeDB) -> bool:
    """A recipe in Postgres is usable if it has a non-null payload and title."""
    return bool(db_recipe.raw and db_recipe.title is not None)


def _to_schema(db_recipe: RecipeDB) -> Recipe:
    return Recipe.model_validate(db_recipe.raw)


def get_recipes(
    session: Session, recipe_ids: set[int], persist: bool = False
) -> list[Recipe]:
    """Return recipes for given IDs.

    Lookup hierarchy:
      1. Postgres
      2. Redis (`recipe:{id}`)
      3. Spoonacular API (caches to Redis)

    If persist=True, any recipe retrieved from Redis or API is upserted into Postgres.
    """
    if not recipe_ids:
        return []

    results: dict[int, Recipe] = {}

    db_recipes = session.exec(
        select(RecipeDB).where(RecipeDB.id.in_(recipe_ids))  # type: ignore[attr-defined]
    ).all()
    for r in db_recipes:
        if _is_usable(r):
            results[r.id] = _to_schema(r)

    missing_ids = set(recipe_ids) - set(results.keys())

    if missing_ids:
        from_redis = get_recipes_from_redis(missing_ids)
        for rid, recipe in from_redis.items():
            results[rid] = recipe
            if persist:
                upsert_recipe(session, recipe)
        missing_ids -= set(from_redis.keys())

    if missing_ids:
        # shortcut: Spoonacular bulk endpoint accepts at most 100 ids; upgrade to pagination if needed
        fetched: list[Recipe] = []
        ids_list = list(missing_ids)
        for batch_start in range(0, len(ids_list), 100):
            batch = ids_list[batch_start : batch_start + 100]
            response = RecipesAPI().get_recipe_information_bulk(",".join(str(i) for i in batch))
            if not response or getattr(response, 'status_code', 200) != 200:
                raise HTTPException(status_code=502, detail="Upstream recipe service unavailable")
            fetched.extend(Recipe.model_validate(r) for r in response.json())
        cache_recipes_in_redis(fetched)
        if len(fetched) < len(missing_ids):
            found = {r.id for r in fetched}
            raise HTTPException(
                status_code=422,
                detail=f"Recipes not found: {','.join(str(i) for i in missing_ids if i not in found)}",
            )
        for r in fetched:
            results[r.id] = r
            if persist:
                upsert_recipe(session, r)

    return [results[rid] for rid in recipe_ids if rid in results]


def get_recipe(session: Session, recipe_id: int, persist: bool = False) -> Recipe:
    """Return one recipe.

    Lookup hierarchy:
      1. Postgres
      2. Redis (`recipe:{id}`)
      3. Spoonacular API (caches to Redis)

    If persist=True, upserts into Postgres.
    """
    db_recipe = session.get(RecipeDB, recipe_id)
    if db_recipe is not None and _is_usable(db_recipe):
        return _to_schema(db_recipe)

    cached = get_recipe_from_redis(recipe_id)
    if cached is not None:
        if persist:
            upsert_recipe(session, cached)
        return cached

    response = RecipesAPI().get_recipe_information_bulk(recipe_id)
    if not response or getattr(response, 'status_code', 200) != 200:
        raise HTTPException(status_code=502, detail="Upstream recipe service unavailable")
    try:
        recipe = Recipe.model_validate(response.json()[0])
    except (ValidationError, IndexError) as exc:
        raise HTTPException(status_code=422, detail="Recipe not found") from exc

    cache_recipe_in_redis(recipe)
    if persist:
        upsert_recipe(session, recipe)
    return recipe


def search_recipes(q: str, limit: int = 20, offset: int = 0) -> SearchResult:
    """Search recipes via the API, caching results in Redis (best-effort)."""
    q = q.lower()
    cache_key = f"{SEARCH_CACHE_PREFIX}:{q}:{limit}:{offset}"
    cached = cache_get(cache_key)
    if cached:
        return SearchResult.model_validate_json(cached)

    response = RecipesAPI().search_recipes_complex(query=q, number=limit, offset=offset)
    if not response or getattr(response, 'status_code', 200) != 200:
        raise HTTPException(status_code=502, detail="Upstream recipe service unavailable")
    result = SearchResult.model_validate(response.json())
    cache_set(cache_key, result.model_dump_json(), ttl=SEARCH_CACHE_TTL)
    return result


# ---------------------------------------------------------------------------
# Random recipes & Daily suggestions
# ---------------------------------------------------------------------------


def fetch_random_recipes(
    number: int = 10, tags: str | None = None
) -> list[Recipe]:
    """Fetch random recipes from the API and cache in Redis. Does NOT write to Postgres."""
    response = RecipesAPI().get_random_recipes(number=number, tags=tags)
    if response is None:
        return []
    payload = response.json()
    raw_recipes = payload.get("recipes", []) if isinstance(payload, dict) else []
    recipes: list[Recipe] = []
    for raw in raw_recipes:
        try:
            recipe = Recipe.model_validate(raw)
        except ValidationError:
            continue
        recipes.append(recipe)
    cache_recipes_in_redis(recipes)
    return recipes


def get_suggestions(number: int = 12) -> list[Recipe]:
    """Return a random sample of suggestions, cached in Redis for 24 hours.

    Pulls from `suggestions:daily`. If missing or expired, samples recipes from
    Redis `recipe:{id}` (or fetches fresh random recipes if needed), saves them
    in `suggestions:daily` with a 24-hour TTL, and returns them.
    Does NOT write to Postgres.
    """
    try:
        cached_json = redis_client.get(SUGGESTIONS_DAILY_KEY)
        if cached_json:
            recipes_data = json.loads(cached_json)
            return [Recipe.model_validate(r) for r in recipes_data][:number]
    except Exception as exc:
        logger.warning("Failed to read daily suggestions from Redis: %s", exc)

    candidate_ids: list[int] = []
    try:
        members = redis_client.srandmember(RECIPES_IDS_SET, number * 2)
        candidate_ids = [int(m) for m in members]
    except redis.RedisError:
        candidate_ids = []

    recipes_by_id = get_recipes_from_redis(candidate_ids) if candidate_ids else {}
    recipes = list(recipes_by_id.values())

    if len(recipes) < number:
        fetched = fetch_random_recipes(number=number)
        seen = {r.id for r in recipes}
        recipes.extend(r for r in fetched if r.id not in seen)

    chosen = recipes[:number]
    if chosen:
        try:
            payload = json.dumps([r.model_dump(mode="json") for r in chosen])
            redis_client.set(SUGGESTIONS_DAILY_KEY, payload, ex=SUGGESTIONS_DAILY_TTL)
        except Exception as exc:
            logger.warning("Failed to cache daily suggestions: %s", exc)

    return chosen


def random_recipe_ids(
    session: Session, count: int, exclude: set[int] | None = None
) -> list[int]:
    """Pick `count` random recipe ids already stored in Postgres, excluding any
    ids in `exclude`. Only returns usable (non-backfilled) recipes."""
    from sqlalchemy import func

    stmt = select(RecipeDB.id).where(RecipeDB.raw.is_not(None))  # type: ignore[attr-defined]
    if exclude:
        stmt = stmt.where(RecipeDB.id.not_in(exclude))  # type: ignore[attr-defined]
    # shortcut: ORDER BY random() is fine while recipe table < 10k rows; upgrade to tablesample or redis set if table grows
    rows = session.exec(stmt.order_by(func.random()).limit(count)).all()
    return list(rows)


def random_cached_recipe_ids(count: int, exclude: set[int] | None = None) -> list[int]:
    """Pick up to `count` recipe ids from active daily suggestions or Redis cached IDs."""
    exclude = exclude or set()
    chosen_ids: list[int] = []

    try:
        cached_json = redis_client.get(SUGGESTIONS_DAILY_KEY)
        if cached_json:
            for item in json.loads(cached_json):
                rid = item.get("id")
                if rid and rid not in exclude and rid not in chosen_ids:
                    chosen_ids.append(rid)
                    if len(chosen_ids) >= count:
                        return chosen_ids
    except Exception:
        pass

    try:
        members = redis_client.srandmember(RECIPES_IDS_SET, count + len(exclude) + 5)
        for m in members:
            rid = int(m)
            if rid not in exclude and rid not in chosen_ids:
                chosen_ids.append(rid)
            if len(chosen_ids) >= count:
                break
    except redis.RedisError:
        pass

    return chosen_ids
