"""Helpers for recipes.

Recipes are persisted in Postgres (hot columns + full Spoonacular payload in a
`raw` JSONB column). On a cache-miss we fetch from the Spoonacular API and
upsert the recipe, its ingredients, and the recipe<->ingredient links. The
`Recipe` API schema is rebuilt from the stored `raw` payload so the response
shape is unchanged.
"""

from datetime import timedelta

import redis
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import Session, select

from app.core.redis import cache_get, cache_set, redis_client
from app.models.ingredients import Ingredient, RecipeDB, RecipeIngredient
from app.models.models import get_datetime_utc
from app.models.recipes import IngredientItem, Recipe, SearchResult
from app.services.recipes_api import RecipesAPI

# Re-fetch a recipe from the API if the stored copy is older than this.
RECIPE_TTL = timedelta(days=7)

# Redis keys / TTLs for search caching and the suggestions pool.
SEARCH_CACHE_PREFIX = "search"
SEARCH_CACHE_TTL = 60 * 60 * 24  # 1 day
SUGGESTIONS_KEY = "suggestions:pool"  # a Redis set of recipe ids
SUGGESTIONS_MAX = 200


# ---------------------------------------------------------------------------
# Persistence (upsert)
# ---------------------------------------------------------------------------


def _recipe_columns(recipe: Recipe) -> dict:
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
    """Insert or update a recipe and its ingredients + links."""
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
        # Store the metric measure (accurate, from Spoonacular) as the
        # canonical amount/unit; fall back to the top-level values if absent.
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


# ---------------------------------------------------------------------------
# Read (DB first, API on miss/stale)
# ---------------------------------------------------------------------------


def _is_fresh(db_recipe: RecipeDB) -> bool:
    """A recipe is usable if it has a payload and isn't stale. Backfilled rows
    (id only, no title/raw) are treated as misses so they get populated."""
    if not db_recipe.raw or db_recipe.title is None:
        return False
    if db_recipe.fetched_at is None:
        return False
    return get_datetime_utc() - db_recipe.fetched_at < RECIPE_TTL


def _to_schema(db_recipe: RecipeDB) -> Recipe:
    return Recipe.model_validate(db_recipe.raw)


def get_recipes(session: Session, recipe_ids: set[int]) -> list[Recipe]:
    """Return recipes, fetching+persisting any that are missing or stale."""
    if not recipe_ids:
        return []

    db_recipes = session.exec(
        select(RecipeDB).where(RecipeDB.id.in_(recipe_ids))  # type: ignore[attr-defined]
    ).all()
    by_id = {r.id: r for r in db_recipes}

    fresh = [_to_schema(r) for r in db_recipes if _is_fresh(r)]
    missing_ids = [
        rid for rid in recipe_ids if rid not in by_id or not _is_fresh(by_id[rid])
    ]

    if missing_ids:
        response = RecipesAPI().get_recipe_information_bulk(
            ",".join(str(i) for i in missing_ids)
        )
        fetched = [Recipe.model_validate(r) for r in response.json()]
        for r in fetched:
            upsert_recipe(session, r)
        if len(fetched) < len(missing_ids):
            found = {r.id for r in fetched}
            raise HTTPException(
                status_code=422,
                detail=f"Recipes not found: {','.join(str(i) for i in missing_ids if i not in found)}",
            )
        fresh.extend(fetched)
    return fresh


def get_recipe(session: Session, recipe_id: int) -> Recipe:
    """Return one recipe, fetching+persisting if missing or stale."""
    db_recipe = session.get(RecipeDB, recipe_id)
    if db_recipe is not None and _is_fresh(db_recipe):
        return _to_schema(db_recipe)

    response = RecipesAPI().get_recipe_information_bulk(recipe_id)
    try:
        recipe = Recipe.model_validate(response.json()[0])
    except (ValidationError, IndexError) as exc:
        raise HTTPException(status_code=422, detail="Recipe not found") from exc
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
    result = SearchResult.model_validate(response.json())
    cache_set(cache_key, result.model_dump_json(), ttl=SEARCH_CACHE_TTL)
    return result


# ---------------------------------------------------------------------------
# Random recipes: harvesting + "suggestions of the day" pool
# ---------------------------------------------------------------------------


def _add_to_suggestions_pool(recipe_ids: list[int]) -> None:
    """Add recipe ids to the Redis suggestions set (best-effort, capped)."""
    if not recipe_ids:
        return
    try:
        redis_client.sadd(SUGGESTIONS_KEY, *recipe_ids)
        # Trim the pool if it grows too large (keep a random subset).
        if redis_client.scard(SUGGESTIONS_KEY) > SUGGESTIONS_MAX:
            overflow = redis_client.scard(SUGGESTIONS_KEY) - SUGGESTIONS_MAX
            redis_client.srem(
                SUGGESTIONS_KEY, *redis_client.srandmember(SUGGESTIONS_KEY, overflow)
            )
    except redis.RedisError as exc:
        import logging

        logging.getLogger(__name__).warning("suggestions pool update failed: %s", exc)


def fetch_random_recipes(
    session: Session, number: int = 10, tags: str | None = None
) -> list[Recipe]:
    """Fetch random recipes from the API, persist them, and add to the pool."""
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
        upsert_recipe(session, recipe)
        recipes.append(recipe)
    _add_to_suggestions_pool([r.id for r in recipes])
    return recipes


def _displayable(recipe: Recipe) -> bool:
    """Only suggest recipes that will render nicely (have title + image)."""
    return bool(recipe.title) and bool(recipe.imageType)


def get_suggestions(session: Session, number: int = 12) -> list[Recipe]:
    """Return a random sample of displayable recipes from the suggestions pool.

    Tops up the pool with fresh random recipes if it doesn't hold enough."""
    pool_size = 0
    ids: list[int] = []
    try:
        pool_size = redis_client.scard(SUGGESTIONS_KEY)
        members = redis_client.srandmember(SUGGESTIONS_KEY, number * 2)
        ids = [int(m) for m in members]
    except redis.RedisError:
        ids, pool_size = [], 0

    db_recipes = (
        session.exec(
            select(RecipeDB).where(RecipeDB.id.in_(ids))  # type: ignore[attr-defined]
        ).all()
        if ids
        else []
    )
    recipes = [_to_schema(r) for r in db_recipes if r.raw]
    recipes = [r for r in recipes if _displayable(r)]

    # Top up from the API if the pool is thin / returned too few good ones.
    if len(recipes) < number or pool_size < number:
        fetched = fetch_random_recipes(session, number=number)
        seen = {r.id for r in recipes}
        recipes.extend(r for r in fetched if _displayable(r) and r.id not in seen)

    return recipes[:number]


def random_recipe_ids(session: Session, count: int) -> list[int]:
    """Pick `count` random recipe ids already stored in Postgres."""
    from sqlalchemy import func

    rows = session.exec(select(RecipeDB.id).order_by(func.random()).limit(count)).all()
    return list(rows)
