"""Helpers for recipes"""

import json

import redis
from fastapi import HTTPException

from app.core.config import settings
from app.models.recipes import Recipe
from app.services.recipes_api import RecipesAPI

RECIPE_CACHE_PREFIX = "recipe"
RECIPE_CACHE_TTL = 172800


redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    password=settings.REDIS_PASSWORD,
)


def cache_recipe(recipe: dict) -> None:
    redis_client.setex(
        f"{RECIPE_CACHE_PREFIX}_{recipe['id']}", RECIPE_CACHE_TTL, json.dumps(recipe)
    )


def get_recipe_from_cache(recipe_id: int) -> dict | None:
    cached_recipes = redis_client.get(f"{RECIPE_CACHE_PREFIX}_{recipe_id}")
    if cached_recipes:
        return json.loads(cached_recipes)


def get_recipes_from_cache(recipe_ids: set[int]) -> tuple[list[dict], list[int]]:
    cached_recipes = []
    not_cached_recipes = []
    for id in recipe_ids:
        if cached_recipe := get_recipe_from_cache(id):
            cached_recipes.append(cached_recipe)
        else:
            not_cached_recipes.append(id)
    return cached_recipes, not_cached_recipes


def get_recipes(recipe_ids: set[int], depth: int = 2) -> list[Recipe]:
    """Retrieve the recipes from the API. Only returns ids when depth equals 1."""
    if depth == 1:
       return [Recipe.model_validate(r) for r in recipe_ids]

    recipes, missing_recipe_ids = get_recipes_from_cache(recipe_ids)
    if missing_recipe_ids:
        response = RecipesAPI().get_recipe_information_bulk(
            ",".join(str(id) for id in missing_recipe_ids)
        )
        result: list = response.json()
        for r in result:
            cache_recipe(r)
        found_recipe_ids = {r["id"] for r in result}
        if len(result) < len(missing_recipe_ids):
            raise HTTPException(
                status_code=422,
                detail=f"Recipes not found: {','.join([str(id) for id in missing_recipe_ids if id not in found_recipe_ids])}",
            )
        recipes.extend(result)
    return [Recipe.model_validate(r) for r in recipes]
