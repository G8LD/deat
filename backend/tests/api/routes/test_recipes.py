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


class _MockResponse:
    def __init__(self, status_code: int, json_data: dict | None = None) -> None:
        self.status_code = status_code
        self._json_data = json_data or {}

    def json(self) -> dict:
        return self._json_data


def test_search_recipes_quota_reached(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(
        recipes_service.RecipesAPI,
        "search_recipes_complex",
        lambda _self, **_kw: _MockResponse(402, {"message": "quota exceeded"}),
    )
    res = client.get(f"{API}/recipes/search?q=pasta&offset=0")
    assert res.status_code == 429
    assert "Daily recipe quota reached" in res.json()["detail"]


def test_get_recipe_quota_reached(client: TestClient, monkeypatch) -> None:
    rid = _rid()
    monkeypatch.setattr(
        recipes_service.RecipesAPI,
        "get_recipe_information_bulk",
        lambda _self, _ids: _MockResponse(429, {"message": "rate limited"}),
    )
    res = client.get(f"{API}/recipes/{rid}")
    assert res.status_code == 429
    assert "Daily recipe quota reached" in res.json()["detail"]


def test_recipes_api_key_rotation(monkeypatch) -> None:
    from app.services.recipes_api import RecipesAPI

    api = RecipesAPI()
    monkeypatch.setattr(api, "api_keys", ["key1", "key2"])
    monkeypatch.setattr(api, "key_index", 0)

    used_keys = []

    def mock_request(method, uri, **kwargs):
        used_keys.append(kwargs.get("params", {}).get("apiKey"))
        return _MockResponse(402)

    monkeypatch.setattr(api.session, "request", mock_request)
    resp = api._make_request("test")
    assert resp.status_code == 402
    assert used_keys == ["key1", "key2"]


def test_search_recipes_stores_individual_recipes_24h(monkeypatch) -> None:
    rid = _rid()
    fake_recipe_data = _make_recipe(rid).model_dump(mode="json")
    called_kwargs = {}

    def fake_complex(_self, **kwargs):
        called_kwargs.update(kwargs)
        return _MockResponse(200, {
            "results": [fake_recipe_data],
            "offset": 0,
            "number": 20,
            "totalResults": 1,
        })

    monkeypatch.setattr(recipes_service.RecipesAPI, "search_recipes_complex", fake_complex)
    result = recipes_service.search_recipes(q=f"search-test-{rid}")
    assert len(result.results) == 1
    assert called_kwargs.get("addRecipeInformation") is True
    assert called_kwargs.get("fillIngredients") is True
    assert called_kwargs.get("addRecipeInstructions") is True

    # Stored individually in Redis
    cached = recipes_service.get_recipe_from_redis(rid)
    assert cached is not None
    assert cached.id == rid

    # TTL is 24 hours
    ttl = recipes_service.redis_client.ttl(f"recipe:{rid}")
    assert 0 < ttl <= 24 * 3600

    # NOT in harvested set
    assert not recipes_service.redis_client.sismember(
        recipes_service.RECIPES_HARVESTED_SET, rid
    )


def test_add_random_recipes_uses_only_harvested(db: Session) -> None:
    from unittest.mock import patch
    from app.models import Menu
    from app.services.menus import add_random_recipes
    from tests.utils.user import create_random_user

    user = create_random_user(db)
    menu = Menu(name=f"random-menu-{_rid()}", owner_id=user.id)
    db.add(menu)
    db.commit()

    rid_search = _rid()
    recipes_service.cache_recipe_in_redis(_make_recipe(rid_search), harvested=False)

    existing_harvested = {
        int(m) for m in recipes_service.redis_client.smembers(recipes_service.RECIPES_HARVESTED_SET)
    }
    rid_harvested = _rid()
    recipes_service.cache_recipe_in_redis(_make_recipe(rid_harvested), harvested=True)

    with patch("app.services.menus.user_menu_recipe_ids", return_value=existing_harvested):
        chosen = add_random_recipes(db, menu, count=1)
        assert chosen == {rid_harvested}
        assert rid_search not in chosen


def test_fetch_random_recipes_main_dish(monkeypatch) -> None:
    called_kwargs = {}

    def fake_random(_self, **kwargs):
        called_kwargs.update(kwargs)
        return _MockResponse(200, {"recipes": []})

    monkeypatch.setattr(recipes_service.RecipesAPI, "get_random_recipes", fake_random)
    recipes_service.fetch_random_recipes(number=5)
    assert called_kwargs.get("tags") == "main course"
    assert called_kwargs.get("number") == 100


def test_add_random_recipes_falls_back_to_spoonacular_when_redis_empty(
    db: Session, monkeypatch
) -> None:
    from unittest.mock import patch
    from app.models import Menu
    from app.services.menus import add_random_recipes
    from tests.utils.user import create_random_user

    user = create_random_user(db)
    menu = Menu(name=f"random-menu-{_rid()}", owner_id=user.id)
    db.add(menu)
    db.commit()

    rid_fetched = _rid()
    fake_recipe = _make_recipe(rid_fetched).model_dump(mode="json")
    called_kwargs = {}

    def fake_random(_self, **kwargs):
        called_kwargs.update(kwargs)
        return _MockResponse(200, {"recipes": [fake_recipe]})

    monkeypatch.setattr(recipes_service.RecipesAPI, "get_random_recipes", fake_random)

    # Exclude all existing harvested IDs so Redis behaves as empty for this user
    all_harvested = {
        int(m) for m in recipes_service.redis_client.smembers(recipes_service.RECIPES_HARVESTED_SET)
    }
    with patch("app.services.menus.user_menu_recipe_ids", return_value=all_harvested):
        chosen = add_random_recipes(db, menu, count=1)
        assert rid_fetched in chosen
        assert called_kwargs.get("number") == 100
        assert called_kwargs.get("tags") == "main course"


def test_enforce_harvested_cap() -> None:
    rids = [_rid() for _ in range(5)]
    recipes = [_make_recipe(rid) for rid in rids]
    recipes_service._enforce_harvested_cap(max_count=2)
    # Cache recipes with a cap of 2
    for r in recipes:
        recipes_service.cache_recipe_in_redis(r, harvested=True)
    recipes_service._enforce_harvested_cap(max_count=2)
    count = recipes_service.redis_client.scard(recipes_service.RECIPES_HARVESTED_SET)
    assert count <= 2





