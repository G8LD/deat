"""Tests for menu routes and recipe persistence / orphan cleanup lifecycle."""

import random

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models.ingredients import RecipeDB
from app.models.recipes import Recipe as RecipeSchema
from app.models.users import User
from app.services import recipes as recipes_service

API = settings.API_V1_STR


def _rid() -> int:
    return random.randint(10_000_000, 99_999_999)


def _make_recipe(
    recipe_id: int, ingredient_ids: list[int] | None = None
) -> RecipeSchema:
    ingredient_ids = ingredient_ids or [101]
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


def test_recipe_view_does_not_persist_but_menu_add_persists(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    rid = _rid()
    recipe = _make_recipe(rid)

    # Pre-cache in Redis (e.g. from harvest/search)
    recipes_service.cache_recipe_in_redis(recipe)
    assert db.get(RecipeDB, rid) is None

    # 1. View recipe: GET /api/v1/recipes/{id}
    res = client.get(f"{API}/recipes/{rid}", headers=superuser_token_headers)
    assert res.status_code == 200
    assert res.json()["id"] == rid
    # Should NOT be in Postgres after viewing
    assert db.get(RecipeDB, rid) is None

    # 2. Add recipe to menu: POST /api/v1/menus/
    menu_res = client.post(
        f"{API}/menus/",
        headers=superuser_token_headers,
        json={"name": f"menu-{rid}", "recipe_ids": [rid]},
    )
    assert menu_res.status_code == 200
    # MUST now be in Postgres
    assert db.get(RecipeDB, rid) is not None


def test_unlinking_recipe_deletes_from_postgres_if_no_other_link(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    rid = _rid()
    recipes_service.cache_recipe_in_redis(_make_recipe(rid))

    # Create menu with this recipe
    create_res = client.post(
        f"{API}/menus/",
        headers=superuser_token_headers,
        json={"name": f"menu-{rid}", "recipe_ids": [rid]},
    )
    assert create_res.status_code == 200
    menu_id = create_res.json()["id"]
    assert db.get(RecipeDB, rid) is not None

    # Remove recipe from menu via PUT /menus/{id}
    update_res = client.put(
        f"{API}/menus/{menu_id}",
        headers=superuser_token_headers,
        json={"recipe_ids": []},
    )
    assert update_res.status_code == 200

    # Recipe should be deleted from Postgres
    assert db.get(RecipeDB, rid) is None


def test_delete_menu_deletes_unlinked_recipe(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    rid = _rid()
    recipes_service.cache_recipe_in_redis(_make_recipe(rid))

    # Create menu with this recipe
    create_res = client.post(
        f"{API}/menus/",
        headers=superuser_token_headers,
        json={"name": f"menu-{rid}", "recipe_ids": [rid]},
    )
    assert create_res.status_code == 200
    menu_id = create_res.json()["id"]
    assert db.get(RecipeDB, rid) is not None

    # Delete menu: DELETE /menus/{id}
    del_res = client.delete(f"{API}/menus/{menu_id}", headers=superuser_token_headers)
    assert del_res.status_code == 200

    # Recipe should be deleted from Postgres
    assert db.get(RecipeDB, rid) is None


def test_delete_menu_preserves_shared_recipe(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    rid = _rid()
    recipes_service.cache_recipe_in_redis(_make_recipe(rid))

    # Create two menus sharing the same recipe
    menu1 = client.post(
        f"{API}/menus/",
        headers=superuser_token_headers,
        json={"name": f"menu-1-{rid}", "recipe_ids": [rid]},
    ).json()

    menu2 = client.post(
        f"{API}/menus/",
        headers=superuser_token_headers,
        json={"name": f"menu-2-{rid}", "recipe_ids": [rid]},
    ).json()

    assert db.get(RecipeDB, rid) is not None

    # Delete menu1
    client.delete(f"{API}/menus/{menu1['id']}", headers=superuser_token_headers)

    # Recipe must STILL exist in Postgres because menu2 still links to it
    assert db.get(RecipeDB, rid) is not None

    # Delete menu2
    client.delete(f"{API}/menus/{menu2['id']}", headers=superuser_token_headers)

    # Now recipe should be deleted from Postgres
    assert db.get(RecipeDB, rid) is None


def test_complete_recipe_requires_auth(client: TestClient) -> None:
    import uuid

    dummy_id = uuid.uuid4()
    res = client.put(f"{API}/menus/{dummy_id}/recipe/999/complete")
    assert res.status_code == 401


def test_complete_recipe_toggles_and_checks_ownership(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    rid = _rid()
    recipes_service.cache_recipe_in_redis(_make_recipe(rid))

    # Create menu
    menu = client.post(
        f"{API}/menus/",
        headers=superuser_token_headers,
        json={"name": f"complete-menu-{rid}", "recipe_ids": [rid]},
    ).json()
    menu_id = menu["id"]

    # Toggle done
    res = client.put(
        f"{API}/menus/{menu_id}/recipe/{rid}/complete",
        headers=superuser_token_headers,
    )
    assert res.status_code == 200
    assert res.json()["message"] == "Recipe completed successfully"

    # Verify done flag in DB
    from app.models.menus import MenuRecipe

    mr = db.get(MenuRecipe, (menu_id, rid))
    assert mr is not None
    assert mr.done is True

    # 404 on nonexistent recipe
    res_404 = client.put(
        f"{API}/menus/{menu_id}/recipe/99999999/complete",
        headers=superuser_token_headers,
    )
    assert res_404.status_code == 404


def test_create_menu_empty_does_not_seed(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    res = client.post(
        f"{API}/menus/",
        headers=superuser_token_headers,
        json={"name": f"empty-menu-{_rid()}"},
    )
    assert res.status_code == 200
    assert res.json()["recipes"] == []


def test_create_menu_with_suggested_recipes(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    rid1, rid2 = _rid(), _rid()
    recipes_service.cache_recipe_in_redis(_make_recipe(rid1))
    recipes_service.cache_recipe_in_redis(_make_recipe(rid2))

    res = client.post(
        f"{API}/menus/",
        headers=superuser_token_headers,
        json={"name": f"suggest-menu-{rid1}", "recipes": 2},
    )
    assert res.status_code == 200
    assert len(res.json()["recipes"]) == 2


def test_cannot_pin_favorites_menu(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    res = client.get(f"{API}/menus/", headers=superuser_token_headers)
    assert res.status_code == 200
    fav = next(m for m in res.json()["data"] if m["name"] == "Favorites")

    update_res = client.put(
        f"{API}/menus/{fav['id']}",
        headers=superuser_token_headers,
        json={"current": True},
    )
    assert update_res.status_code == 400
    assert "cannot be set as current" in update_res.json()["detail"]
