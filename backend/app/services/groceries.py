"""Per-menu grocery lists.

A menu's grocery list is materialised in `menu_ingredient`: one line per
(menu, ingredient, source recipe), carrying that recipe's amount/unit/original
and a `checked` flag for shopping progress.

`sync_menu_groceries` reconciles the stored lines with the menu's current
recipes (from `recipe_ingredient`): it inserts lines for newly added recipes
and deletes lines for removed recipes, while preserving `checked` on lines that
remain. Keeping `recipe_id` in the key means the same ingredient from two
recipes stays as two traceable lines with exact amounts.
"""

import uuid

from sqlmodel import Session, delete, select, update

from app.models.ingredients import (
    GroceryItem,
    GroceryItemSource,
    GroceryList,
    Ingredient,
    MenuIngredient,
    RecipeIngredient,
)
from app.models.menus import MenuRecipe


def sync_menu_groceries(session: Session, menu_id: uuid.UUID) -> None:
    """Reconcile a menu's grocery lines with its current recipes' ingredients.

    - Insert a line for each (recipe_id, ingredient_id) in the menu's recipes
      that has no line yet (checked defaults to False).
    - Delete lines whose (recipe_id, ingredient_id) is no longer required.
    - Preserve `checked` (and the row) for lines that remain.
    """
    # Desired lines: every ingredient of every recipe currently in the menu.
    desired_rows = session.exec(
        select(
            MenuRecipe.recipe_id,
            RecipeIngredient.ingredient_id,
            RecipeIngredient.amount,
            RecipeIngredient.unit,
            RecipeIngredient.original,
        )
        .join(
            RecipeIngredient,
            RecipeIngredient.recipe_id == MenuRecipe.recipe_id,  # type: ignore[arg-type]
        )
        .where(MenuRecipe.menu_id == menu_id)
    ).all()
    desired = {(r.recipe_id, r.ingredient_id): r for r in desired_rows}

    existing_lines = session.exec(
        select(MenuIngredient).where(MenuIngredient.menu_id == menu_id)
    ).all()
    existing_keys = {(line.recipe_id, line.ingredient_id) for line in existing_lines}

    # Delete lines no longer desired.
    for line in existing_lines:
        if (line.recipe_id, line.ingredient_id) not in desired:
            session.delete(line)

    # Insert newly desired lines (preserve existing ones untouched).
    for (recipe_id, ingredient_id), row in desired.items():
        if (recipe_id, ingredient_id) in existing_keys:
            continue
        session.add(
            MenuIngredient(
                menu_id=menu_id,
                ingredient_id=ingredient_id,
                recipe_id=recipe_id,
                amount=row.amount,
                unit=row.unit,
                original=row.original,
                checked=False,
            )
        )
    session.commit()


def get_grocery_list(session: Session, menu_id: uuid.UUID) -> GroceryList:
    """Build the grocery list for a menu, grouped by ingredient."""
    rows = session.exec(
        select(MenuIngredient, Ingredient)
        .join(Ingredient, Ingredient.id == MenuIngredient.ingredient_id)  # type: ignore[arg-type]
        .where(MenuIngredient.menu_id == menu_id)
    ).all()

    items: dict[int, GroceryItem] = {}
    total = 0
    checked_count = 0
    for line, ingredient in rows:
        total += 1
        if line.checked:
            checked_count += 1
        item = items.get(ingredient.id)
        if item is None:
            item = GroceryItem(
                ingredient_id=ingredient.id,
                name=ingredient.name,
                image=ingredient.image,
                aisle=ingredient.aisle,
                sources=[],
            )
            items[ingredient.id] = item
        item.sources.append(
            GroceryItemSource(
                recipe_id=line.recipe_id,
                amount=line.amount,
                unit=line.unit,
                original=line.original,
                checked=line.checked,
            )
        )

    return GroceryList(
        menu_id=menu_id,
        items=sorted(items.values(), key=lambda i: (i.aisle or "", i.name)),
        total=total,
        checked_count=checked_count,
    )


def set_line_checked(
    session: Session,
    menu_id: uuid.UUID,
    ingredient_id: int,
    recipe_id: int,
    checked: bool,
) -> MenuIngredient | None:
    """Set the checked flag on a single grocery line."""
    line = session.get(MenuIngredient, (menu_id, ingredient_id, recipe_id))
    if line is None:
        return None
    line.checked = checked
    session.add(line)
    session.commit()
    return line


def set_ingredient_checked(
    session: Session,
    menu_id: uuid.UUID,
    ingredient_id: int,
    checked: bool,
) -> int:
    """Set the checked flag on all lines of an ingredient (all its sources).

    Returns the number of lines updated. Lets the UI tick an ingredient off
    even when it comes from several recipes.
    """
    lines = session.exec(
        select(MenuIngredient).where(
            MenuIngredient.menu_id == menu_id,
            MenuIngredient.ingredient_id == ingredient_id,
        )
    ).all()
    for line in lines:
        line.checked = checked
        session.add(line)
    session.commit()
    return len(lines)


def set_all_checked(session: Session, menu_id: uuid.UUID, checked: bool) -> int:
    """Set the checked flag on all lines for a menu."""
    statement = (
        update(MenuIngredient)
        .where(MenuIngredient.menu_id == menu_id)  # type: ignore[arg-type]
        .values(checked=checked)
    )
    result = session.exec(statement)
    session.commit()
    return result.rowcount  # type: ignore[return-value]


def clear_menu_groceries(session: Session, menu_id: uuid.UUID) -> None:
    """Remove all grocery lines for a menu."""
    session.exec(
        delete(MenuIngredient).where(MenuIngredient.menu_id == menu_id)  # type: ignore[arg-type]
    )
    session.commit()
