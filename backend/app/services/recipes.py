"""Helpers for recipes"""

import redis
from fastapi import HTTPException

from app.core.config import settings
from app.models.recipes import Recipe, SearchResult
from app.services.recipes_api import RecipesAPI

RECIPE_CACHE_PREFIX = "recipe"
SEARCH_CACHE_PREFIX = "search"
CACHE_TTL = 604800  # 1 week


redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    password=settings.REDIS_PASSWORD,
)


def cache_recipe(recipe: Recipe) -> None:
    redis_client.setex(
        f"{RECIPE_CACHE_PREFIX}_{recipe.id}", CACHE_TTL, recipe.model_dump_json()
    )


def get_recipe_from_cache(recipe_id: int) -> Recipe | None:
    cached_recipe = redis_client.get(f"{RECIPE_CACHE_PREFIX}_{recipe_id}")
    if cached_recipe:
        return Recipe.model_validate_json(cached_recipe)


def get_recipes_from_cache(recipe_ids: set[int]) -> tuple[list[Recipe], list[int]]:
    cached_recipes = []
    not_cached_recipes = []
    for r_id in recipe_ids:
        if cached_recipe := get_recipe_from_cache(r_id):
            cached_recipes.append(cached_recipe)
        else:
            not_cached_recipes.append(r_id)
    return cached_recipes, not_cached_recipes


def cache_search(search: SearchResult) -> None:
    redis_client.setex(
        f"{SEARCH_CACHE_PREFIX}_{search}", CACHE_TTL, search.model_dump_json()
    )


def get_search_from_cache(search_key: str) -> SearchResult | None:
    cached_search = redis_client.get(f"{SEARCH_CACHE_PREFIX}_{search_key}")
    if cached_search:
        return SearchResult.model_validate_json(cached_search)


def get_recipes(recipe_ids: set[int], depth: int = 2) -> list[Recipe]:
    """Retrieve the recipes from the API. Only returns ids when depth equals 1."""
    if depth == 1:
        return [Recipe.model_validate({"id": r}) for r in recipe_ids]

    recipes, missing_recipe_ids = get_recipes_from_cache(recipe_ids)
    if missing_recipe_ids:
        response = RecipesAPI().get_recipe_information_bulk(
            ",".join(str(id) for id in missing_recipe_ids)
        )
        result = [Recipe.model_validate(r) for r in response.json()]
        for r in result:
            cache_recipe(r)
        if len(result) < len(missing_recipe_ids):
            found_recipe_ids = {r.id for r in result}
            raise HTTPException(
                status_code=422,
                detail=f"Recipes not found: {','.join([str(id) for id in missing_recipe_ids if id not in found_recipe_ids])}",
            )
        recipes.extend(result)
    return recipes


def search_recipes(q: str, limit: int = 20, offset: int = 0) -> SearchResult:
    """Search recipes with the API."""
    q = q.lower()
    search_result = get_search_from_cache(f"{q}_{limit}_{offset}")
    if not search_result:
        response = RecipesAPI().search_recipes_complex(
            query=q, number=limit, offset=offset
        )
        search_result = SearchResult.model_validate(response.json())
        cache_search(search_result)
    return search_result
