import uuid

from sqlmodel import Field, SQLModel


class MenuRecipeLink(SQLModel, table=True):
    menu_id: uuid.UUID = Field(foreign_key="menu.id", primary_key=True)
    recipe_id: int = Field(foreign_key="recipe.id", primary_key=True)
