"""Background task: harvest random recipes until the Spoonacular quota is
(nearly) exhausted, caching them in Redis for fast suggestions and retrieval.

Scheduled (via APScheduler) to run shortly before the daily quota reset, using
up whatever quota remains for the day. Recipes are cached in Redis under
`recipe:{id}` with their IDs tracked in `recipes:ids`, without writing to Postgres.
"""

import logging

from app.core.redis import try_acquire_lock
from app.services import recipes as recipes_service
from app.services.recipes_api import RecipesAPI

logger = logging.getLogger(__name__)

# Lock so that, with multiple server workers all scheduling the job, only one
# actually runs the harvest per day. ~23h TTL < the 24h schedule interval.
HARVEST_LOCK_KEY = "deat:harvest:lock"
HARVEST_LOCK_TTL = 23 * 3600

# Stop when the remaining daily quota (points) drops below this.
QUOTA_FLOOR = 5.0
# Each random-recipes call fetches this many recipes (100 is max & most quota-efficient).
BATCH_SIZE = 100
# Hard cap on batches per run, as a safety valve.
MAX_BATCHES = 100


def _remaining_points(response) -> float | None:
    """Read the remaining daily quota from Spoonacular response headers."""
    if response is None:
        return None
    try:
        return float(response.headers.get("X-API-Quota-Left"))
    except (TypeError, ValueError):
        return None


def harvest_random_recipes() -> int:
    """Fetch random recipes in batches until quota is exhausted.

    Returns the number of recipes harvested and cached in Redis."""
    api = RecipesAPI()
    if not api.api_keys:
        logger.info("No Spoonacular API key configured; skipping harvest.")
        return 0

    # Only one worker/instance harvests per day.
    if not try_acquire_lock(HARVEST_LOCK_KEY, HARVEST_LOCK_TTL):
        logger.info("Harvest already running/done today (lock held); skipping.")
        return 0

    harvested = 0
    for _ in range(MAX_BATCHES):
        response = api.get_random_recipes(number=BATCH_SIZE, tags="main course")
        if response is None:
            break
        # 402/429 after key rotation exhausted -> stop.
        if response.status_code in (402, 429):
            logger.info("Quota/rate limit reached; stopping harvest.")
            break
        try:
            payload = response.json()
        except ValueError:
            break
        raw = payload.get("recipes", []) if isinstance(payload, dict) else []
        if not raw:
            break
        batch_recipes: list[recipes_service.Recipe] = []
        for item in raw:
            try:
                recipe = recipes_service.Recipe.model_validate(item)
            except Exception:  # noqa: BLE001
                continue
            batch_recipes.append(recipe)
            harvested += 1
        if batch_recipes:
            recipes_service.cache_recipes_in_redis(batch_recipes, harvested=True)

        if recipes_service.redis_client.scard(recipes_service.RECIPES_HARVESTED_SET) >= recipes_service.MAX_HARVESTED_RECIPES:
            logger.info("Harvested cap reached (%d recipes in pool); stopping.", recipes_service.MAX_HARVESTED_RECIPES)
            break

        remaining = _remaining_points(response)
        if remaining is not None and remaining < QUOTA_FLOOR:
            logger.info("Quota floor reached (%.1f left); stopping.", remaining)
            break

    logger.info("Harvest complete: %d recipes cached.", harvested)
    return harvested
