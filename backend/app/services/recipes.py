"""Helpers for recipes"""

from fastapi import HTTPException
from sqlmodel import col, select

from app.api.deps import SessionDep
from app.models.recipes import Recipe
from app.services.recipes_api import RecipesAPI


def get_or_create_recipes(session: SessionDep, recipe_ids: list[int]) -> list[Recipe]:
    """Retrieve recipies from the db based on the ids
    if not in db retrieve them from the api and create them
    """
    statement = select(Recipe).where(col(Recipe.id).in_(recipe_ids))
    result = list(session.exec(statement=statement).all())
    existing_recipe_ids = {r.id for r in result}
    missing_recipe_ids = [id for id in recipe_ids if id not in existing_recipe_ids]
    if missing_recipe_ids:
        result.extend(create_recipes(session, missing_recipe_ids))
    return result


def create_recipes(session: SessionDep, recipe_ids: list[int]) -> list[Recipe]:
    """Retrieve the recipes from the API and add it to db"""
    client = RecipesAPI()
    response = client.get_recipe_information_bulk(
        ",".join(str(id) for id in recipe_ids)
    )
    result = response.json()
    existing_recipe_ids = {r["id"] for r in result}
    if len(result) < len(recipe_ids):
        raise HTTPException(
            status_code=422,
            detail=f"Recipes not found: {','.join([str(id) for id in recipe_ids if id not in existing_recipe_ids])}",
        )

    recipes = [Recipe.model_validate({"id": r["id"], "content": r}) for r in result]
    session.add_all(recipes)
    session.commit()
    return recipes
