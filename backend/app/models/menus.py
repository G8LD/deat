import uuid
from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint

from app.models.many_to_many import MenuRecipeLink
from app.models.models import get_datetime_utc
from app.models.recipes import Recipe, RecipePublic
from app.models.users import User


class MenuBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)


# Properties to receive on menu creation
class MenuCreate(MenuBase):
    recipe_ids: list[int] | None = None


# Properties to receive on menu update
class MenuUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    recipe_ids: list[int] | None = None


# Database model, database table inferred from class name
class Menu(MenuBase, table=True):
    __table_args__: tuple[UniqueConstraint] = (
        UniqueConstraint("title", "owner_id", name="unique_menu_title_and_owner_id"),
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
    recipes: list[Recipe] = Relationship(
        back_populates="menus", link_model=MenuRecipeLink
    )


# Properties to return via API
class MenuPublic(MenuBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None
    recipes: list[RecipePublic] = Field(default_factory=list)


class MenusPublic(SQLModel):
    data: list[MenuPublic]
    count: int
