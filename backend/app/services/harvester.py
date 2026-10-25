"""Background task: harvest random recipes until the Spoonacular quota is
(nearly) exhausted, caching them in Redis for fast suggestions and retrieval.

Scheduled (via APScheduler) to run shortly before the daily quota reset, using
up whatever quota remains for the day. Recipes are cached in Redis under
`recipe:{id}` with their IDs tracked in `recipes:ids`, without writing to Postgres.
"""

import logging

import requests

from app.core.redis import redis_client, try_acquire_lock
from app.models.recipes import Recipe
from app.services import recipes as recipes_service
from app.services.recipes_api import RecipesAPI

logger = logging.getLogger(__name__)

# Lock so that, with multiple server workers all scheduling the job, only one
# actually runs the harvest per day. ~23h TTL < the 24h schedule interval.
HARVEST_LOCK_KEY = "deat:harvest:lock"
HARVEST_LOCK_TTL = 23 * 3600

# Stop when the remaining daily quota (points) drops below this per key.
QUOTA_FLOOR = 5.0
# Each random-recipes call fetches this many recipes (100 is max & most quota-efficient).
BATCH_SIZE = 100
# Hard cap on batches per key, as a safety valve.
MAX_BATCHES = 10


def _remaining_points(response: requests.Response | None) -> float | None:
    """Read the remaining daily quota from Spoonacular response headers."""
    if response is None:
        return None
    try:
        return float(response.headers.get("X-API-Quota-Left"))
    except TypeError, ValueError:
        return None


def _parse_recipes(response: requests.Response) -> list[Recipe]:
    """Extract and validate recipes from Spoonacular response."""
    try:
        data = response.json()
    except ValueError:
        return []
    raw = data.get("recipes", []) if isinstance(data, dict) else []
    recipes: list[Recipe] = []
    for item in raw:
        try:
            recipes.append(Recipe.model_validate(item))
        except Exception:  # noqa: BLE001
            continue
    return recipes


def harvest_random_recipes() -> int:
    """Harvest recipes across all configured API keys until each hits the quota floor."""
    api = RecipesAPI()
    if not api.api_keys:
        logger.info("No Spoonacular API key configured; skipping harvest.")
        return 0

    # Only one worker/instance harvests per day.
    if not try_acquire_lock(HARVEST_LOCK_KEY, HARVEST_LOCK_TTL):
        logger.info("Harvest already running/done today (lock held); skipping.")
        return 0

    harvested = 0
    for key_index in range(len(api.api_keys)):
        api.key_index = key_index

        for _ in range(MAX_BATCHES):
            if (
                redis_client.scard(recipes_service.RECIPES_HARVESTED_SET)
                >= recipes_service.MAX_HARVESTED_RECIPES
            ):
                logger.info(
                    "Harvested cap reached (%d recipes in pool); stopping.",
                    recipes_service.MAX_HARVESTED_RECIPES,
                )
                return harvested

            response = api.get_random_recipes(number=BATCH_SIZE, tags="main course")
            if response is None or response.status_code in (402, 429):
                break

            recipes = _parse_recipes(response)
            if not recipes:
                break

            recipes_service.cache_recipes_in_redis(recipes, harvested=True)
            harvested += len(recipes)

            remaining = _remaining_points(response)
            if remaining is not None and remaining < QUOTA_FLOOR:
                logger.info(
                    "Key #%d reached quota floor (%.1f points left); next key.",
                    key_index + 1,
                    remaining,
                )
                break

    logger.info("Harvest complete: %d recipes cached.", harvested)
    return harvested
