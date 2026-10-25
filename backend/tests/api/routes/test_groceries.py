"""Tests for the grocery API routes."""

import random

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models.menus import Menu, MenuRecipe
from app.models.recipes import Recipe as RecipeSchema
from app.models.users import User
from app.services import recipes as recipes_service

API = settings.API_V1_STR


def _rid() -> int:
    return random.randint(1_000_000_00, 9_999_999_99)


def _make_recipe(recipe_id: int, ingredient_ids: list[int]) -> RecipeSchema:
    return RecipeSchema.model_validate(
        {
            "id": recipe_id,
            "title": f"Recipe {recipe_id}",
            "extendedIngredients": [
                {
                    "id": ing_id,
                    "name": f"ingredient {ing_id}",
                    "original": f"1 cup ingredient {ing_id}",
                    "amount": 1.0,
                    "unit": "cup",
                    "measures": {
                        "us": {"amount": 1.0, "unitShort": "cup", "unitLong": "cup"},
                        "metric": {
                            "amount": 1.0,
                            "unitShort": "cup",
                            "unitLong": "cup",
                        },
                    },
                }
                for ing_id in ingredient_ids
            ],
        }
    )


def _superuser(db: Session) -> User:
    from sqlmodel import select

    return db.exec(select(User).where(User.email == settings.FIRST_SUPERUSER)).one()


def _make_menu(db: Session, ingredient_ids: list[int]) -> Menu:
    rid = _rid()
    recipes_service.upsert_recipe(db, _make_recipe(rid, ingredient_ids))
    menu = Menu(
        name=f"grocery-api-{random.randint(1, 1_000_000)}",
        owner_id=_superuser(db).id,
        recipe_links=[MenuRecipe(recipe_id=rid)],
    )
    db.add(menu)
    db.commit()
    db.refresh(menu)
    return menu


def test_sync_then_get_grocery_list(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    menu = _make_menu(db, [700001, 700002])

    r = client.post(
        f"{API}/menus/{menu.id}/groceries/sync", headers=superuser_token_headers
    )
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 2
    assert data["progress"] == 0.0

    r = client.get(f"{API}/menus/{menu.id}/groceries", headers=superuser_token_headers)
    assert r.status_code == 200
    assert {i["ingredient_id"] for i in r.json()["items"]} == {700001, 700002}


def test_check_ingredient_updates_progress(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    menu = _make_menu(db, [710001, 710002])
    client.post(
        f"{API}/menus/{menu.id}/groceries/sync", headers=superuser_token_headers
    )

    r = client.patch(
        f"{API}/menus/{menu.id}/groceries/ingredients/710001/check",
        headers=superuser_token_headers,
        json={"checked": True},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["checked_count"] == 1
    assert data["progress"] == 0.5


def test_clear_groceries(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    menu = _make_menu(db, [720001])
    client.post(
        f"{API}/menus/{menu.id}/groceries/sync", headers=superuser_token_headers
    )

    r = client.delete(
        f"{API}/menus/{menu.id}/groceries", headers=superuser_token_headers
    )
    assert r.status_code == 200

    r = client.get(f"{API}/menus/{menu.id}/groceries", headers=superuser_token_headers)
    assert r.json()["total"] == 0


def test_groceries_require_auth(client: TestClient, db: Session) -> None:
    menu = _make_menu(db, [730001])
    r = client.get(f"{API}/menus/{menu.id}/groceries")
    assert r.status_code == 401


def test_grocery_menu_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    import uuid

    r = client.get(
        f"{API}/menus/{uuid.uuid4()}/groceries", headers=superuser_token_headers
    )
    assert r.status_code == 404


def test_check_all_ingredients(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    menu = _make_menu(db, [740001, 740002])
    client.post(
        f"{API}/menus/{menu.id}/groceries/sync", headers=superuser_token_headers
    )

    # Check all
    r = client.patch(
        f"{API}/menus/{menu.id}/groceries/check-all",
        headers=superuser_token_headers,
        json={"checked": True},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["checked_count"] == 2
    assert data["progress"] == 1.0

    # Uncheck all (Clear)
    r = client.patch(
        f"{API}/menus/{menu.id}/groceries/check-all",
        headers=superuser_token_headers,
        json={"checked": False},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["checked_count"] == 0
    assert data["progress"] == 0.0
