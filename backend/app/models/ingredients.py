"""Persistent tables for recipes, ingredients and per-menu grocery lists.

Recipes used to live only in Redis. They are now stored in Postgres with the
hot fields promoted to columns and the full Spoonacular payload kept in a
`raw` JSONB column (so no data is lost and more columns can be promoted later
without re-fetching).

Image URLs are built on the frontend from raw data following Spoonacular's
conventions, so we store only the building blocks here:
  * recipe: `image_type` (+ `id`)  -> img.spoonacular.com/recipes/{id}-{size}.{type}
  * ingredient: `image` filename    -> img.spoonacular.com/ingredients_{size}/{file}
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Column, DateTime
from sqlmodel import Field, Relationship, SQLModel

from app.models.models import get_datetime_utc

# ---------------------------------------------------------------------------
# Ingredient
# ---------------------------------------------------------------------------


class IngredientBase(SQLModel):
    name: str = Field(max_length=255, index=True)
    name_clean: str | None = Field(default=None, max_length=255)
    aisle: str | None = Field(default=None, max_length=255)
    # Bare Spoonacular image filename (e.g. "flour.png"); URL built on frontend.
    image: str | None = Field(default=None, max_length=255)


class Ingredient(IngredientBase, table=True):
    __tablename__ = "ingredient"

    # Spoonacular ingredient id (stable); seeded from CSV / recipe fetches.
    id: int = Field(primary_key=True)
    # Possible units for the ingredient (from the seed CSV).
    possible_units: list[str] = Field(default_factory=list, sa_column=Column(JSON))

    recipe_links: list[RecipeIngredient] = Relationship(back_populates="ingredient")


class IngredientPublic(IngredientBase):
    id: int
    possible_units: list[str] = []


# ---------------------------------------------------------------------------
# Recipe (persisted)
# ---------------------------------------------------------------------------


class RecipeDB(SQLModel, table=True):
    __tablename__ = "recipe"

    # Spoonacular recipe id (BIGINT).
    id: int = Field(primary_key=True)

    # --- hot columns (list/detail display & sorting) ---
    title: str | None = Field(default=None, max_length=255)
    image_type: str | None = Field(default=None, max_length=16)
    ready_in_minutes: int | None = None
    servings: int | None = None
    health_score: float | None = None
    source_url: str | None = Field(default=None, max_length=2048)
    summary: str | None = None

    # --- full Spoonacular payload (everything else incl. diet flags) ---
    raw: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    fetched_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    ingredient_links: list[RecipeIngredient] = Relationship(
        back_populates="recipe", cascade_delete=True
    )


# ---------------------------------------------------------------------------
# Recipe <-> Ingredient (M2M with per-recipe quantity)
# ---------------------------------------------------------------------------


class RecipeIngredient(SQLModel, table=True):
    __tablename__ = "recipe_ingredient"

    recipe_id: int = Field(
        foreign_key="recipe.id", primary_key=True, ondelete="CASCADE"
    )
    ingredient_id: int = Field(
        foreign_key="ingredient.id", primary_key=True, ondelete="CASCADE"
    )
    # Quantity is a property of *this ingredient in this recipe*.
    amount: float | None = None
    unit: str | None = Field(default=None, max_length=64)
    original: str | None = Field(default=None, max_length=512)
    measures: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))

    recipe: RecipeDB = Relationship(back_populates="ingredient_links")
    ingredient: Ingredient = Relationship(back_populates="recipe_links")


# ---------------------------------------------------------------------------
# Menu grocery list: ingredient line per source recipe
# ---------------------------------------------------------------------------


class MenuIngredient(SQLModel, table=True):
    __tablename__ = "menu_ingredient"

    menu_id: uuid.UUID = Field(
        foreign_key="menu.id", primary_key=True, ondelete="CASCADE"
    )
    ingredient_id: int = Field(
        foreign_key="ingredient.id", primary_key=True, ondelete="CASCADE"
    )
    # recipe_id is part of the PK so the same ingredient coming from different
    # recipes stays as distinct lines (exact, traceable amounts) and removing a
    # recipe only deletes that recipe's lines (preserving `checked` on others).
    recipe_id: int = Field(
        foreign_key="recipe.id", primary_key=True, ondelete="CASCADE"
    )
    amount: float | None = None
    unit: str | None = Field(default=None, max_length=64)
    original: str | None = Field(default=None, max_length=512)
    checked: bool = Field(default=False)

    ingredient: Ingredient = Relationship()


# ---------------------------------------------------------------------------
# Grocery API schemas
# ---------------------------------------------------------------------------


class GroceryItemSource(SQLModel):
    recipe_id: int
    amount: float | None = None
    unit: str | None = None
    original: str | None = None
    checked: bool = False


class GroceryItem(SQLModel):
    """One ingredient on a menu's grocery list, with its per-recipe sources."""

    ingredient_id: int
    name: str
    image: str | None = None
    aisle: str | None = None
    sources: list[GroceryItemSource] = []


class GroceryList(SQLModel):
    menu_id: uuid.UUID
    items: list[GroceryItem] = []
    total: int = 0
    checked_count: int = 0

    @property
    def progress(self) -> float:
        return self.checked_count / self.total if self.total else 0.0
