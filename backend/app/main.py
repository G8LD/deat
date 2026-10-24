from contextlib import asynccontextmanager
from pathlib import Path

import sentry_sdk
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response

from app.api.main import api_router
from app.core.config import settings
from app.services.harvester import harvest_random_recipes

FRONTEND_DIR = Path(__file__).parent / "frontend"


def custom_generate_unique_id(route: APIRoute) -> str:
    if route.tags:
        return f"{route.tags[0]}-{route.name}"
    return route.name


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


# Serve the built single-page app (if present). The frontend is built into
# FRONTEND_DIR by the Docker image; in local dev it's served by Vite instead,
# so this is a no-op when the directory is absent.
if (FRONTEND_DIR / "index.html").exists():
    # Hashed asset files, served directly.
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIR / "assets"),
        name="assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str) -> Response:
        # API/docs are handled above; everything else returns a real file if it
        # exists, otherwise index.html so client-side routing works.
        candidate = FRONTEND_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIR / "index.html")
