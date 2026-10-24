import uuid

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import (
    Menu,
    MenuPublic,
    Recipe,
)
from app.models.menus import MenuRecipe, MenuRecipePublic
from app.services import recipes as recipes_service
from app.services.recipes import get_recipes

# Maximum number of recipes a single menu may hold.
MAX_MENU_RECIPES = 50


def to_public(menu: Menu, recipes: list[Recipe]) -> MenuPublic:
    """Build MenuPublic, keeping only the recipes linked to this menu."""
    recipes_by_id = {r.id: r for r in recipes}
    menu_recipes = [
        MenuRecipePublic.model_validate(
            recipes_by_id[link.recipe_id],
            update={"done": link.done, "created_at": link.created_at},
        )
        for link in menu.recipe_links
        if link.recipe_id in recipes_by_id
    ]
    menu_recipes.sort(key=lambda recipe: recipe.created_at, reverse=True)
    return MenuPublic.model_validate(
        menu,
        update={"recipes": menu_recipes},
    )


def menu_public(session: Session, menu: Menu, depth: int = 1) -> MenuPublic:
    """Fetch the menu's recipes and build MenuPublic."""
    recipe_ids = {link.recipe_id for link in menu.recipe_links}
    recipes = []
    if recipe_ids and depth > 1:
        recipes = get_recipes(session, recipe_ids)
    return to_public(menu, recipes)


def set_recipe_links(menu: Menu, recipe_ids: set[int]) -> None:
    """Make the menu's links match recipe_ids, keeping existing rows (and their
    `done` flag) for recipes that stay."""
    if len(recipe_ids) > MAX_MENU_RECIPES:
        raise HTTPException(
            status_code=422,
            detail=f"A menu can hold at most {MAX_MENU_RECIPES} recipes",
        )
    kept = [link for link in menu.recipe_links if link.recipe_id in recipe_ids]
    existing = {link.recipe_id for link in kept}
    menu.recipe_links = kept + [
        MenuRecipe(recipe_id=rid) for rid in recipe_ids - existing
    ]


def user_menu_recipe_ids(session: Session, owner_id: uuid.UUID) -> set[int]:
    """All recipe ids that appear in any menu owned by the given user."""
    rows = session.exec(
        select(MenuRecipe.recipe_id)
        .join(Menu, MenuRecipe.menu_id == Menu.id)
        .where(Menu.owner_id == owner_id)
    ).all()
    return set(rows)


def add_random_recipes(session: Session, menu: Menu, count: int = 3) -> set[int]:
    """Add up to `count` random recipes to a menu.

    Selection order (cheapest / most relevant first):
      1. Recipes already in Postgres that are NOT in any of the user's menus.
      2. Random recipes from the Redis suggestions pool.
      3. Fresh random recipes harvested from the Spoonacular API.

    Returns the resulting id set for the menu."""
    existing = {link.recipe_id for link in menu.recipe_links}

    # Never exceed the per-menu cap; top up only up to the remaining room.
    count = max(0, min(count, MAX_MENU_RECIPES - len(existing)))
    if count == 0:
        return existing

    # Exclude recipes already in this menu *and* any of the user's other menus,
    # so "add random" surfaces recipes the user hasn't seen in their menus yet.
    exclude = existing | user_menu_recipe_ids(session, menu.owner_id)

    chosen: list[int] = []

    def take(ids: list[int]) -> None:
        for rid in ids:
            if rid not in exclude and rid not in chosen:
                chosen.append(rid)
            if len(chosen) >= count:
                break

    # 1. Postgres, excluding anything in the user's menus.
    take(recipes_service.random_recipe_ids(session, count * 2, exclude=exclude))

    # 2. Redis suggestions pool.
    if len(chosen) < count:
        take(recipes_service.random_pool_ids(count * 2, exclude=exclude | set(chosen)))

    # 3. Spoonacular (fresh harvest) as a last resort.
    if len(chosen) < count:
        fetched = recipes_service.fetch_random_recipes(session, number=count * 2)
        take([r.id for r in fetched])

    chosen = chosen[:count]
    result = existing | set(chosen)
    set_recipe_links(menu, result)
    return result
