from app.models import (
    Menu,
    MenuPublic,
    Recipe,
)
from app.models.menus import MenuRecipe, MenuRecipePublic
from app.services.recipes import get_recipes


def to_public(menu: Menu, recipes: list[Recipe]) -> MenuPublic:
    """Build MenuPublic, keeping only the recipes linked to this menu."""
    recipes_by_id = {r.id: r for r in recipes}
    menu_recipes= [
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


def menu_public(menu: Menu, depth: int = 2) -> MenuPublic:
    """Fetch the menu's recipes and build MenuPublic."""
    recipe_ids = {link.recipe_id for link in menu.recipe_links}
    recipes = get_recipes(recipe_ids, depth) if recipe_ids else []
    return to_public(menu, recipes)


def set_recipe_links(menu: Menu, recipe_ids: set[int]) -> None:
    """Make the menu's links match recipe_ids, keeping existing rows (and their
    `done` flag) for recipes that stay."""
    kept = [link for link in menu.recipe_links if link.recipe_id in recipe_ids]
    existing = {link.recipe_id for link in kept}
    menu.recipe_links = kept + [
        MenuRecipe(recipe_id=rid) for rid in recipe_ids - existing
    ]
