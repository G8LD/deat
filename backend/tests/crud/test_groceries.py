"""Tests for the grocery service (generate / merge / progress)."""

import random

from sqlmodel import Session

from app.models.menus import Menu, MenuRecipe
from app.models.recipes import Recipe as RecipeSchema
from app.services import groceries
from app.services import recipes as recipes_service
from tests.utils.user import create_random_user


def _rid() -> int:
    return random.randint(100_000_000, 999_999_999)


def _make_recipe(recipe_id: int, ingredients: list[tuple[int, str]]) -> RecipeSchema:
    """ingredients: list of (ingredient_id, unit)."""
    return RecipeSchema.model_validate(
        {
            "id": recipe_id,
            "title": f"Recipe {recipe_id}",
            "extendedIngredients": [
                {
                    "id": ing_id,
                    "name": f"ingredient {ing_id}",
                    "original": f"1 {unit} ingredient {ing_id}",
                    "amount": 1.0,
                    "unit": unit,
                    "measures": {
                        "us": {"amount": 1.0, "unitShort": unit, "unitLong": unit},
                        "metric": {"amount": 1.0, "unitShort": unit, "unitLong": unit},
                    },
                }
                for ing_id, unit in ingredients
            ],
        }
    )


def _menu_with_recipes(db: Session, recipes: list[RecipeSchema]) -> Menu:
    user = create_random_user(db)
    for r in recipes:
        recipes_service.upsert_recipe(db, r)
    menu = Menu(
        name=f"menu-{random.randint(1, 1_000_000)}",
        owner_id=user.id,
        recipe_links=[MenuRecipe(recipe_id=r.id) for r in recipes],
    )
    db.add(menu)
    db.commit()
    db.refresh(menu)
    return menu


def test_sync_generates_lines_for_all_recipe_ingredients(db: Session) -> None:
    r = _make_recipe(_rid(), [(1001, "cup"), (1002, "g")])
    menu = _menu_with_recipes(db, [r])
    groceries.sync_menu_groceries(db, menu.id)

    gl = groceries.get_grocery_list(db, menu.id)
    assert gl.total == 2
    assert {item.ingredient_id for item in gl.items} == {1001, 1002}
    assert gl.checked_count == 0
    assert gl.progress == 0.0


def test_same_ingredient_from_two_recipes_stays_separate(db: Session) -> None:
    rid_a, rid_b = _rid(), _rid()
    # both recipes use ingredient 2001 (same unit) -> two distinct source lines
    a = _make_recipe(rid_a, [(2001, "cup")])
    b = _make_recipe(rid_b, [(2001, "cup")])
    menu = _menu_with_recipes(db, [a, b])
    groceries.sync_menu_groceries(db, menu.id)

    gl = groceries.get_grocery_list(db, menu.id)
    # one grocery item (grouped by ingredient) with two sources
    assert gl.total == 2  # two lines
    item = next(i for i in gl.items if i.ingredient_id == 2001)
    assert {s.recipe_id for s in item.sources} == {rid_a, rid_b}


def test_merge_preserves_checked_on_resync(db: Session) -> None:
    r = _make_recipe(_rid(), [(3001, "cup"), (3002, "g")])
    menu = _menu_with_recipes(db, [r])
    groceries.sync_menu_groceries(db, menu.id)

    # check one line
    line = next(iter(groceries.get_grocery_list(db, menu.id).items))
    groceries.set_line_checked(
        db, menu.id, line.ingredient_id, line.sources[0].recipe_id, True
    )
    assert groceries.get_grocery_list(db, menu.id).checked_count == 1

    # re-sync with no recipe change must preserve the checked line
    groceries.sync_menu_groceries(db, menu.id)
    assert groceries.get_grocery_list(db, menu.id).checked_count == 1


def test_removing_recipe_deletes_only_its_lines(db: Session) -> None:
    rid_a, rid_b = _rid(), _rid()
    a = _make_recipe(rid_a, [(4001, "cup"), (4002, "g")])
    b = _make_recipe(rid_b, [(4003, "ml")])
    menu = _menu_with_recipes(db, [a, b])
    groceries.sync_menu_groceries(db, menu.id)
    assert groceries.get_grocery_list(db, menu.id).total == 3

    # remove recipe b, re-sync
    menu.recipe_links = [link for link in menu.recipe_links if link.recipe_id != rid_b]
    db.add(menu)
    db.commit()
    groceries.sync_menu_groceries(db, menu.id)

    gl = groceries.get_grocery_list(db, menu.id)
    assert gl.total == 2
    assert all(s.recipe_id != rid_b for item in gl.items for s in item.sources)


def test_progress_and_check_all_sources(db: Session) -> None:
    rid_a, rid_b = _rid(), _rid()
    a = _make_recipe(rid_a, [(5001, "cup")])
    b = _make_recipe(rid_b, [(5001, "cup")])  # same ingredient, 2 sources
    menu = _menu_with_recipes(db, [a, b])
    groceries.sync_menu_groceries(db, menu.id)
    assert groceries.get_grocery_list(db, menu.id).total == 2

    # check all sources of ingredient 5001 at once
    updated = groceries.set_ingredient_checked(db, menu.id, 5001, True)
    assert updated == 2
    gl = groceries.get_grocery_list(db, menu.id)
    assert gl.checked_count == 2
    assert gl.progress == 1.0


def test_clear_removes_all_lines(db: Session) -> None:
    r = _make_recipe(_rid(), [(6001, "cup")])
    menu = _menu_with_recipes(db, [r])
    groceries.sync_menu_groceries(db, menu.id)
    assert groceries.get_grocery_list(db, menu.id).total == 1

    groceries.clear_menu_groceries(db, menu.id)
    assert groceries.get_grocery_list(db, menu.id).total == 0
