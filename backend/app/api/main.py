from fastapi import APIRouter

from app.api.routes import groceries, login, menus, private, recipes, users, utils
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(menus.router)
api_router.include_router(recipes.router)
api_router.include_router(groceries.router)


if settings.FASTAPI_ENV == "development":
    api_router.include_router(private.router)
