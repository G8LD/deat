from sqlmodel import Session

from app.models import (
    Menu,
    MenuPublic,
    Recipe,
)
from app.models.menus import MenuRecipe, MenuRecipePublic
from app.services import recipes as recipes_service
from app.services.recipes import get_recipes


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
    kept = [link for link in menu.recipe_links if link.recipe_id in recipe_ids]
    existing = {link.recipe_id for link in kept}
    menu.recipe_links = kept + [
        MenuRecipe(recipe_id=rid) for rid in recipe_ids - existing
    ]


def add_random_recipes(session: Session, menu: Menu, count: int = 3) -> set[int]:
    """Add up to `count` random recipes (not already in the menu) to a menu.

    Prefers recipes already stored locally; harvests fresh random ones from the
    API if the local store doesn't have enough. Returns the resulting id set."""
    existing = {link.recipe_id for link in menu.recipe_links}

    # Try local store first (cheap, no API call).
    candidates = [
        rid
        for rid in recipes_service.random_recipe_ids(session, count + len(existing) + 5)
        if rid not in existing
    ]

    # Not enough locally? fetch fresh random recipes from the API.
    if len(candidates) < count:
        fetched = recipes_service.fetch_random_recipes(session, number=count * 2)
        candidates += [r.id for r in fetched if r.id not in existing]

    chosen = candidates[:count]
    set_recipe_links(menu, existing | set(chosen))
    return existing | set(chosen)
