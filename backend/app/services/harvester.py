"""Background task: harvest random recipes until the Spoonacular quota is
(nearly) exhausted, so the suggestions pool and local recipe store stay fresh.

Scheduled (via APScheduler) to run shortly before the daily quota reset, using
up whatever quota remains for the day.
"""

import logging

from sqlmodel import Session

from app.core.db import engine
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
# Each random-recipes call fetches this many recipes.
BATCH_SIZE = 10
# Hard cap on batches per run, as a safety valve.
MAX_BATCHES = 100


def _remaining_points(response) -> float | None:
    """Read the remaining daily quota from Spoonacular response headers."""
    if response is None:
        return None
    try:
        return float(response.headers.get("X-API-Quota-Left"))
    except TypeError, ValueError:
        return None


def harvest_random_recipes() -> int:
    """Fetch random recipes in batches until quota is exhausted.

    Returns the number of recipes harvested."""
    api = RecipesAPI()
    if not api.api_keys:
        logger.info("No Spoonacular API key configured; skipping harvest.")
        return 0

    # Only one worker/instance harvests per day.
    if not try_acquire_lock(HARVEST_LOCK_KEY, HARVEST_LOCK_TTL):
        logger.info("Harvest already running/done today (lock held); skipping.")
        return 0

    harvested = 0
    with Session(engine) as session:
        for _ in range(MAX_BATCHES):
            response = api.get_random_recipes(number=BATCH_SIZE)
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
            for item in raw:
                try:
                    recipe = recipes_service.Recipe.model_validate(item)
                except Exception:  # noqa: BLE001
                    continue
                recipes_service.upsert_recipe(session, recipe)
                harvested += 1
            recipes_service._add_to_suggestions_pool(
                [r["id"] for r in raw if "id" in r]
            )

            remaining = _remaining_points(response)
            if remaining is not None and remaining < QUOTA_FLOOR:
                logger.info("Quota floor reached (%.1f left); stopping.", remaining)
                break

    logger.info("Harvest complete: %d recipes.", harvested)
    return harvested
