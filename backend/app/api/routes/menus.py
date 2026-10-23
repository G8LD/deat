import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import func, select, update

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Menu,
    MenuCreate,
    MenuPublic,
    MenusPublic,
    MenuUpdate,
    Message,
)
from app.models.menus import FAVORITES_MENU_NAME, MenuRecipe, MenuRecipeUpdate
from app.services.menus import menu_public, set_recipe_links, to_public
from app.services.recipes import get_recipes

router = APIRouter(prefix="/menus", tags=["menus"])


def get_menu_or_error(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Menu:
    menu = session.get(Menu, id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    if not current_user.is_superuser and (menu.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return menu


@router.get("/", response_model=MenusPublic)
def read_menus(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    depth: int = 1,
    display: bool = False,
    recipe_id: int | None = None,
) -> Any:
    """
    Retrieve menus.

    When display is True, it will returns recipes details only for Favorites and current menus.

    Depth:
        1. No Recipes returned
        2. Returns only recipes' ids
        3. Returns full detailed recipes
    """
    count_statement = (
        select(func.count()).select_from(Menu).where(Menu.owner_id == current_user.id)
    )
    statement = (
        select(Menu)
        .where(Menu.owner_id == current_user.id)
        .order_by(Menu.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if recipe_id:
        count_statement = count_statement.join(MenuRecipe).where(
            MenuRecipe.recipe_id == recipe_id
        )
        statement = statement.join(MenuRecipe).where(MenuRecipe.recipe_id == recipe_id)
    count = session.exec(count_statement).one()
    menus = session.exec(statement).all()

    if not display:
        recipe_ids = {link.recipe_id for menu in menus for link in menu.recipe_links}
    else:
        depth = 2
        recipe_ids = []
        for menu in menus:
            if menu.name != FAVORITES_MENU_NAME and not menu.current:
                continue
            recipe_ids.extend([link.recipe_id for link in menu.recipe_links])
        recipe_ids = set(recipe_ids)

    recipes = []
    if recipe_ids and depth > 1:
        recipes = get_recipes(recipe_ids)
    menus_public = [to_public(menu, recipes) for menu in menus]
    return MenusPublic(data=menus_public, count=count)


@router.get("/{id}", response_model=MenuPublic)
def read_menu(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID, depth: int = 1
) -> Any:
    """
    Get menu by ID.
    """
    menu = get_menu_or_error(session, current_user, id)
    return menu_public(menu, depth)


@router.post("/", response_model=MenuPublic)
def create_menu(
    *, session: SessionDep, current_user: CurrentUser, menu_in: MenuCreate
) -> Any:
    """
    Create new menu.
    """
    recipe_ids = set(menu_in.recipe_ids or [])
    recipes = get_recipes(recipe_ids)

    menu = Menu.model_validate(menu_in, update={"owner_id": current_user.id})
    set_recipe_links(menu, recipe_ids)

    if menu.current:
        session.exec(
            update(Menu).where(Menu.owner_id == current_user.id).values(current=False)
        )
    try:
        session.add(menu)
        session.commit()
        session.refresh(menu)
    except IntegrityError as exc:
        session.rollback()
        if "unique_menu_name_and_owner_id" not in str(exc):
            raise
        raise HTTPException(422, "This name is already taken") from exc

    return to_public(menu, recipes)


@router.put("/{id}", response_model=MenuPublic)
def update_menu(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    menu_in: MenuUpdate,
    depth: int = 1,
) -> Any:
    """
    Update an menu.
    """
    menu = get_menu_or_error(session, current_user, id)
    if menu.name == FAVORITES_MENU_NAME and menu_in.name:
        raise HTTPException(
            status_code=403,
            detail=f"{FAVORITES_MENU_NAME} menu name can not be changed",
        )

    if menu_in.recipe_ids is not None:
        recipe_ids = set(menu_in.recipe_ids)
        get_recipes(recipe_ids)  # validate before touching the menu
        set_recipe_links(menu, recipe_ids)

    exclude = ["recipe_ids"]
    if menu_in.current is None:
        exclude.append("current")
    else:
        session.exec(
            update(Menu).where(Menu.owner_id == current_user.id).values(current=False)
        )

    # recipe_ids is not a column on Menu; handled above
    update_dict = menu_in.model_dump(exclude_unset=True, exclude=set(exclude))
    menu.sqlmodel_update(update_dict)
    try:
        session.add(menu)
        session.commit()
        session.refresh(menu)
    except IntegrityError as exc:
        session.rollback()
        if "unique_menu_name_and_owner_id" not in str(exc):
            raise
        raise HTTPException(422, "This name is already taken") from exc
    return menu_public(menu, depth)


@router.delete("/{id}")
def delete_menu(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete an menu.
    """
    menu = session.get(Menu, id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    if menu.name == FAVORITES_MENU_NAME:
        raise HTTPException(
            status_code=404, detail=f"{FAVORITES_MENU_NAME} menu can not be deleted"
        )
    if not current_user.is_superuser and (menu.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(menu)
    session.commit()
    return Message(message="Menu deleted successfully")


@router.post("/recipes", response_model=Message)
def update_recipes(
    session: SessionDep, current_user: CurrentUser, m_r_update: MenuRecipeUpdate
) -> Any:
    """
    Add/Remove recipes to/from a menus
    """
    if m_r_update.add:
        statement = select(Menu).where(
            Menu.owner_id == current_user.id, Menu.id.in_(m_r_update.add.menu_ids)
        )
        menus = session.exec(statement)
        new_ids = set(m_r_update.add.recipe_ids)
        get_recipes(recipe_ids=new_ids)  # validate ids
        for menu in menus:
            current_ids = {link.recipe_id for link in menu.recipe_links}
            set_recipe_links(menu, current_ids | new_ids)
            session.add(menu)

    if m_r_update.remove:
        statement = select(Menu).where(
            Menu.owner_id == current_user.id, Menu.id.in_(m_r_update.remove.menu_ids)
        )
        menus = session.exec(statement)
        removed_ids = set(m_r_update.remove.recipe_ids)
        for menu in menus:
            menu.recipe_links = [
                link for link in menu.recipe_links if link.recipe_id not in removed_ids
            ]
            session.add(menu)

    session.commit()
    return Message(message="Recipes updated successfully")


@router.put("/{id}/recipe/{recipe_id}/complete", response_model=Message)
def complete_recipe(
    session: SessionDep,
    id: uuid.UUID,
    recipe_id: int,
) -> Any:
    """
    Mark a not done recipe as done and a done recipe as not done.
    """
    statement = select(MenuRecipe).where(
        MenuRecipe.menu_id == id, MenuRecipe.recipe_id == recipe_id
    )
    menu_recipe = session.exec(statement).one()
    menu_recipe.done = not menu_recipe.done
    session.add(menu_recipe)
    session.commit()
    return Message(message="Recipe completed successfully")
