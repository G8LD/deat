import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import CurrentUser, SessionDep
from app.models import GroceryList, Menu, Message
from app.services import groceries

router = APIRouter(prefix="/menus/{menu_id}/groceries", tags=["groceries"])


class CheckUpdate(BaseModel):
    checked: bool
    # When recipe_id is given, only that source line is toggled; otherwise all
    # lines of the ingredient (every source) are toggled together.
    recipe_id: int | None = None


def _get_menu_or_error(
    session: SessionDep, current_user: CurrentUser, menu_id: uuid.UUID
) -> Menu:
    menu = session.get(Menu, menu_id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    if not current_user.is_superuser and menu.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return menu


@router.get("", response_model=GroceryList)
def read_groceries(
    session: SessionDep, current_user: CurrentUser, menu_id: uuid.UUID
) -> Any:
    """Return the grocery list for a menu, grouped by ingredient, with progress."""
    _get_menu_or_error(session, current_user, menu_id)
    return groceries.get_grocery_list(session, menu_id)


@router.post("/sync", response_model=GroceryList)
def sync_groceries(
    session: SessionDep, current_user: CurrentUser, menu_id: uuid.UUID
) -> Any:
    """Regenerate the grocery list from the menu's current recipes.

    Preserves the checked state of lines that remain.
    """
    _get_menu_or_error(session, current_user, menu_id)
    groceries.sync_menu_groceries(session, menu_id)
    return groceries.get_grocery_list(session, menu_id)


@router.patch("/ingredients/{ingredient_id}/check", response_model=GroceryList)
def check_ingredient(
    session: SessionDep,
    current_user: CurrentUser,
    menu_id: uuid.UUID,
    ingredient_id: int,
    update: CheckUpdate,
) -> Any:
    """Toggle an ingredient's checked state (a single source line via
    `recipe_id`, or all of its source lines when `recipe_id` is omitted)."""
    _get_menu_or_error(session, current_user, menu_id)

    if update.recipe_id is not None:
        line = groceries.set_line_checked(
            session, menu_id, ingredient_id, update.recipe_id, update.checked
        )
        if line is None:
            raise HTTPException(status_code=404, detail="Grocery line not found")
    else:
        updated = groceries.set_ingredient_checked(
            session, menu_id, ingredient_id, update.checked
        )
        if updated == 0:
            raise HTTPException(
                status_code=404, detail="Ingredient not on this grocery list"
            )
    return groceries.get_grocery_list(session, menu_id)


@router.delete("", response_model=Message)
def clear_groceries(
    session: SessionDep, current_user: CurrentUser, menu_id: uuid.UUID
) -> Any:
    """Remove all grocery lines for a menu."""
    _get_menu_or_error(session, current_user, menu_id)
    groceries.clear_menu_groceries(session, menu_id)
    return Message(message="Grocery list cleared")
