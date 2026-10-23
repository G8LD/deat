from contextlib import asynccontextmanager
from pathlib import Path

import sentry_sdk
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.routing import APIRoute
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings
from app.services.harvester import harvest_random_recipes

FRONTEND_DIR = Path(__file__).parent / "frontend"


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


if settings.SENTRY_DSN and settings.FASTAPI_ENV != "development":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)


scheduler = BackgroundScheduler(timezone="UTC")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Spoonacular's daily quota resets at 00:00 UTC; harvest what's left just
    # before the reset. Only run when at least one API key is configured.
    if settings.spoonacular_api_keys:
        scheduler.add_job(
            harvest_random_recipes,
            CronTrigger(hour=23, minute=50),
            id="harvest_random_recipes",
            replace_existing=True,
            misfire_grace_time=3600,
        )
        scheduler.start()
    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_HOST],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)
# app.frontend("/", directory=FRONTEND_DIR)
