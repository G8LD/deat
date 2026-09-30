import uuid
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Menu, MenuCreate, MenuPublic, MenusPublic, MenuUpdate, Message
from app.services.recipes import get_or_create_recipes

router = APIRouter(prefix="/menus", tags=["menus"])


@router.get("/", response_model=MenusPublic)
def read_menus(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve menus.
    """

    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(Menu)
        count = session.exec(count_statement).one()
        statement = (
            select(Menu).order_by(col(Menu.created_at).desc()).offset(skip).limit(limit)
        )
        menus = session.exec(statement).all()
    else:
        count_statement = (
            select(func.count())
            .select_from(Menu)
            .where(Menu.owner_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(Menu)
            .where(Menu.owner_id == current_user.id)
            .order_by(col(Menu.created_at).desc())
            .offset(skip)
            .limit(limit)
        )
        menus = session.exec(statement).all()

    menus_public = [MenuPublic.model_validate(menu) for menu in menus]
    return MenusPublic(data=menus_public, count=count)


@router.get("/{id}", response_model=MenuPublic)
def read_menu(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get menu by ID.
    """
    menu = session.get(Menu, id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    if not current_user.is_superuser and (menu.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return menu


@router.post("/", response_model=MenuPublic)
def create_menu(
    *, session: SessionDep, current_user: CurrentUser, menu_in: MenuCreate
) -> Any:
    """
    Create new menu.
    """
    menu = Menu.model_validate(menu_in, update={"owner_id": current_user.id})

    if menu_in.recipe_ids:
        menu.recipes = get_or_create_recipes(session, menu_in.recipe_ids)
    try:
        session.add(menu)
        session.commit()
        session.refresh(menu)
    except IntegrityError as exc:
        if "unique_menu_title_and_owner_id" not in str(exc):
            raise
        raise HTTPException(422, "This name is already taken") from exc
    return menu


@router.put("/{id}", response_model=MenuPublic)
def update_menu(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    menu_in: MenuUpdate,
) -> Any:
    """
    Update an menu.
    """
    menu = session.get(Menu, id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    if not current_user.is_superuser and (menu.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if isinstance(menu_in.recipe_ids, list) and len(menu_in.recipe_ids) == 0:
        menu.recipes = []
    elif menu_in.recipe_ids is not None:
        menu.recipes = get_or_create_recipes(session, menu_in.recipe_ids)

    update_dict = menu_in.model_dump(exclude_unset=True)
    menu.sqlmodel_update(update_dict)
    try:
        session.add(menu)
        session.commit()
        session.refresh(menu)

    except IntegrityError as exc:
        if "unique_menu_title_and_owner_id" not in str(exc):
            raise
        raise HTTPException(422, "This name is already taken") from exc
    return menu


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
    if menu.title == "Favorites":
        raise HTTPException(status_code=404, detail="Favorites menu can not be deleted")
    if not current_user.is_superuser and (menu.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(menu)
    session.commit()
    return Message(message="Menu deleted successfully")


@router.put("/{id}/recipes/add", response_model=MenuPublic)
def add_recipes(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    recipe_id: Annotated[list[int], Query()],
) -> Any:
    """
    Add recipies to a menu
    """
    menu = session.get(Menu, id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    if not current_user.is_superuser and (menu.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    menu.recipes = menu.recipes + get_or_create_recipes(session, recipe_id)
    session.add(menu)
    session.commit()
    session.refresh(menu)
    return menu


@router.put("/{id}/recipes/remove", response_model=MenuPublic)
def remove_recipes(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    recipe_id: Annotated[list[int], Query()],
) -> Any:
    """
    Remove recipies to a menu
    """
    menu = session.get(Menu, id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    if not current_user.is_superuser and (menu.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    menu.recipes = [r for r in menu.recipes if r.id not in recipe_id]
    session.add(menu)
    session.commit()
    session.refresh(menu)
    return menu
