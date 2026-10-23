"""Tests for recipe/ingredient persistence (upsert + JSONB round-trip + FK)."""

import random

from sqlmodel import Session, select

from app.models.ingredients import Ingredient, RecipeDB, RecipeIngredient
from app.models.recipes import Recipe
from app.services import recipes as recipes_service


def _recipe_id() -> int:
    return random.randint(10_000_000, 99_999_999)


def _make_recipe(recipe_id: int, ingredient_ids: list[int]) -> Recipe:
    return Recipe.model_validate(
        {
            "id": recipe_id,
            "title": "Test Dish",
            "imageType": "jpg",
            "readyInMinutes": 30,
            "servings": 4,
            "healthScore": 55.5,
            "sourceUrl": "https://example.com/r",
            "summary": "A tasty test dish.",
            "cuisines": ["italian"],
            "vegetarian": True,
            "extendedIngredients": [
                {
                    "id": ing_id,
                    "name": f"ingredient {ing_id}",
                    "nameClean": f"clean {ing_id}",
                    "aisle": "Produce",
                    "image": f"img{ing_id}.png",
                    "original": f"2 cups ingredient {ing_id}",
                    "amount": 2.0,
                    "unit": "cups",
                    "measures": {
                        "us": {"amount": 2.0, "unitShort": "cup", "unitLong": "cups"},
                        "metric": {
                            "amount": 300.0,
                            "unitShort": "g",
                            "unitLong": "grams",
                        },
                    },
                }
                for ing_id in ingredient_ids
            ],
        }
    )


def test_upsert_recipe_persists_hot_columns_and_raw(db: Session) -> None:
    rid = _recipe_id()
    recipe = _make_recipe(rid, [111111, 222222])
    recipes_service.upsert_recipe(db, recipe)

    db_recipe = db.get(RecipeDB, rid)
    assert db_recipe is not None
    # hot columns
    assert db_recipe.title == "Test Dish"
    assert db_recipe.image_type == "jpg"
    assert db_recipe.ready_in_minutes == 30
    assert db_recipe.servings == 4
    assert db_recipe.health_score == 55.5
    # JSONB round-trip keeps the non-promoted fields
    assert db_recipe.raw["cuisines"] == ["italian"]
    assert db_recipe.raw["vegetarian"] is True


def test_upsert_recipe_is_idempotent_and_updates(db: Session) -> None:
    rid = _recipe_id()
    recipes_service.upsert_recipe(db, _make_recipe(rid, [333333]))
    # second upsert with a changed title updates in place (no duplicate row)
    updated = _make_recipe(rid, [333333])
    updated.title = "Updated Dish"
    recipes_service.upsert_recipe(db, updated)

    rows = db.exec(select(RecipeDB).where(RecipeDB.id == rid)).all()
    assert len(rows) == 1
    assert rows[0].title == "Updated Dish"


def test_upsert_creates_ingredients_and_links(db: Session) -> None:
    rid = _recipe_id()
    ing_ids = [444444, 555555]
    recipes_service.upsert_recipe(db, _make_recipe(rid, ing_ids))

    for ing_id in ing_ids:
        assert db.get(Ingredient, ing_id) is not None

    links = db.exec(
        select(RecipeIngredient).where(RecipeIngredient.recipe_id == rid)
    ).all()
    assert {link.ingredient_id for link in links} == set(ing_ids)
    for link in links:
        # amount/unit are persisted from the metric measure
        assert link.amount == 300.0
        assert link.unit == "g"
        assert link.original.startswith("2 cups")
        # measures JSON round-trip (both systems preserved)
        assert link.measures["metric"]["unitShort"] == "g"
        assert link.measures["us"]["unitShort"] == "cup"


class _FakeResponse:
    def __init__(self, payload: object) -> None:
        self._payload = payload

    def json(self) -> object:
        return self._payload


def test_get_recipe_fetches_and_persists_on_miss(db: Session, monkeypatch) -> None:
    rid = _recipe_id()
    payload = _make_recipe(rid, [666666]).model_dump(mode="json")

    def fake_bulk(_self, _ids):  # noqa: ANN001
        return _FakeResponse([payload])

    monkeypatch.setattr(
        recipes_service.RecipesAPI, "get_recipe_information_bulk", fake_bulk
    )

    # not in DB yet -> fetch + persist
    result = recipes_service.get_recipe(db, rid)
    assert result.id == rid
    assert db.get(RecipeDB, rid) is not None

    # second call is served from DB (fresh) without the API — make the API raise
    def boom(_self, _ids):  # noqa: ANN001
        raise AssertionError("should not call API when fresh")

    monkeypatch.setattr(recipes_service.RecipesAPI, "get_recipe_information_bulk", boom)
    cached = recipes_service.get_recipe(db, rid)
    assert cached.id == rid


def test_get_recipes_batch_fetches_missing(db: Session, monkeypatch) -> None:
    rid_a, rid_b = _recipe_id(), _recipe_id()
    payloads = [
        _make_recipe(rid_a, [677777]).model_dump(mode="json"),
        _make_recipe(rid_b, [688888]).model_dump(mode="json"),
    ]

    def fake_bulk(_self, _ids):  # noqa: ANN001
        return _FakeResponse(payloads)

    monkeypatch.setattr(
        recipes_service.RecipesAPI, "get_recipe_information_bulk", fake_bulk
    )

    results = recipes_service.get_recipes(db, {rid_a, rid_b})
    assert {r.id for r in results} == {rid_a, rid_b}
    assert db.get(RecipeDB, rid_a) is not None
    assert db.get(RecipeDB, rid_b) is not None
