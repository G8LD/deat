"""HTTP integration tests for recipe endpoints."""

import random

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models.menus import Menu, MenuRecipe
from app.models.recipes import Recipe as RecipeSchema
from app.models.recipes import SearchResult
from app.services import recipes as recipes_service
from tests.utils.user import create_random_user

API = settings.API_V1_STR


def _rid() -> int:
    return random.randint(10_000_000, 99_999_999)


def _make_recipe(recipe_id: int) -> RecipeSchema:
    return RecipeSchema.model_validate(
        {
            "id": recipe_id,
            "title": f"Recipe {recipe_id}",
            "extendedIngredients": [],
        }
    )


def test_search_recipes_offset_validation(client: TestClient) -> None:
    # Offset must be multiple of 20
    res = client.get(f"{API}/recipes/search?q=pasta&offset=5")
    assert res.status_code == 422
    assert "Offset can only be a multiple of 20" in res.json()["detail"]


def test_search_recipes_success(client: TestClient, monkeypatch) -> None:
    fake_result = SearchResult(
        results=[_make_recipe(_rid())], offset=0, number=20, totalResults=1
    )
    monkeypatch.setattr(recipes_service, "search_recipes", lambda q, offset=0: fake_result)

    res = client.get(f"{API}/recipes/search?q=pasta&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert data["totalResults"] == 1
    assert len(data["results"]) == 1


def test_suggestions(client: TestClient, monkeypatch) -> None:
    rid = _rid()
    monkeypatch.setattr(recipes_service, "get_suggestions", lambda number=12: [_make_recipe(rid)])

    res = client.get(f"{API}/recipes/suggestions?number=1")
    assert res.status_code == 200
    recipes = res.json()
    assert len(recipes) == 1
    assert recipes[0]["id"] == rid


def test_get_recipe(client: TestClient) -> None:
    rid = _rid()
    recipes_service.cache_recipe_in_redis(_make_recipe(rid))

    res = client.get(f"{API}/recipes/{rid}")
    assert res.status_code == 200
    assert res.json()["id"] == rid


def test_get_recipe_menus_requires_auth(client: TestClient) -> None:
    res = client.get(f"{API}/recipes/123/menus")
    assert res.status_code == 401


def test_get_recipe_menus_returns_user_menus(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    rid = _rid()
    recipe = _make_recipe(rid)
    recipes_service.upsert_recipe(db, recipe)

    user = create_random_user(db)
    menu = Menu(name=f"Menu-{rid}", owner_id=user.id)
    menu.recipe_links = [MenuRecipe(recipe_id=rid)]
    db.add(menu)
    db.commit()

    from sqlmodel import select

    from app.models import User

    su = db.exec(select(User).where(User.email == settings.FIRST_SUPERUSER)).one()
    su_menu = Menu(name=f"SU-Menu-{rid}", owner_id=su.id)
    su_menu.recipe_links = [MenuRecipe(recipe_id=rid)]
    db.add(su_menu)
    db.commit()

    res = client.get(f"{API}/recipes/{rid}/menus", headers=superuser_token_headers)
    assert res.status_code == 200
    menu_ids = res.json()
    assert str(su_menu.id) in menu_ids
    assert str(menu.id) not in menu_ids
