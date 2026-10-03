import uuid
from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint

from app.models.models import get_datetime_utc
from app.models.recipes import Recipe
from app.models.users import User

FAVORITES_MENU_NAME = "Favorites"


class MenuRecipe(SQLModel, table=True):
    menu_id: uuid.UUID = Field(
        foreign_key="menu.id", primary_key=True, ondelete="CASCADE"
    )
    recipe_id: int = Field(primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    done: bool = Field(default=False)
    menu: Menu = Relationship(back_populates="recipe_links")


class MenuBase(SQLModel):
    name: str = Field(min_length=1, max_length=50)
    current: bool = Field(default=False)


class MenuCreate(MenuBase):
    recipe_ids: list[int] | None = None


class MenuUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    current: bool | None = None
    recipe_ids: list[int] | None = None


class Menu(MenuBase, table=True):
    __table_args__ = (
        UniqueConstraint("name", "owner_id", name="unique_menu_name_and_owner_id"),
    )
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="menus")
    recipe_links: list[MenuRecipe] = Relationship(
        back_populates="menu", cascade_delete=True
    )


class MenuRecipePublic(Recipe):
    done: bool = False
    created_at: datetime


class MenuPublic(MenuBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None
    recipes: list[MenuRecipePublic] = Field(default_factory=list)


class MenusPublic(SQLModel):
    data: list[MenuPublic]
    count: int
