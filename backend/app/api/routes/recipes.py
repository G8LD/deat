import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select
from sqlmodel.sql._expression_select_cls import SelectOfScalar

from app.api.deps import CurrentUser, SessionDep
from app.models import Menu, Recipe
from app.models.menus import MenuRecipe
from app.models.recipes import SearchResult
from app.services import recipes

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.get("/search", response_model=SearchResult)
def search_recipes(
    q: str,
    offset: int = 0,
) -> Any:
    """
    Search recipes. offset is multiple of 20 only.
    """
    if offset % 20 != 0:
        raise HTTPException(422, "Offset can only be a multiple of 20.")
    return recipes.search_recipes(q.lower(), offset=offset)


@router.get("/{id}/menus", response_model=list[uuid.UUID])
def get_recipe_menus(session: SessionDep, current_user: CurrentUser, id: int) -> Any:
    """
    Returns the menu ids linked to the recipe
    """
    statement: SelectOfScalar[uuid.UUID] = (
        select(Menu.id)
        .join(MenuRecipe)
        .where(Menu.owner_id == current_user.id)
        .where(MenuRecipe.recipe_id == id)
    )
    return session.exec(statement).all()

@router.get("/{id}", response_model=Recipe)
def get_recipe(session: SessionDep, id: int) -> Any:
    """
    Returns the menu ids linked to the recipe
    """
    return recipes.get_recipe(id)
