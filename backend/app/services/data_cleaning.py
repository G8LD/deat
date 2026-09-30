from sqlmodel import Session, col, delete, select

from app.core.db import engine
from app.models.many_to_many import MenuRecipeLink
from app.models.recipes import Recipe


def delete_unused_recipes():
    with Session(engine) as session:
        statement = delete(Recipe).where(
            ~col(Recipe.id).in_(select(MenuRecipeLink.recipe_id))
        )
        session.exec(statement)
        session.commit()
