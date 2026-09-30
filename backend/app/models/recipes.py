from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import JSON, BigInteger, Column, Field, Relationship, SQLModel

from app.models.many_to_many import MenuRecipeLink
from app.models.models import get_datetime_utc


class RecipeBase(SQLModel):
    content: dict = Field(default_factory=dict, sa_column=Column(JSON))


# Properties to receive on recipe creation
class RecipeCreate(RecipeBase):
    pass


# Properties to receive on recipe update
class RecipeUpdate(SQLModel):
    id: int | None = Field(default=None, min_length=1, max_length=255)


# Database model, database table inferred from class name
class Recipe(RecipeBase, table=True):
    id: int = Field(primary_key=True, sa_type=BigInteger)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    menus: list["Menu"] = Relationship(  # noqa: F821, UP037  # ty: ignore[unresolved-reference]
        back_populates="recipes", link_model=MenuRecipeLink
    )


# Properties to return via API, id is always required
class RecipePublic(RecipeBase):
    id: int
    created_at: datetime | None = None


class RecipesPublic(SQLModel):
    data: list[RecipePublic]
    count: int
