"""Redis client used for caching search results and the suggestions pool.

All access is best-effort: if Redis is unavailable, cache helpers degrade to
no-ops / misses rather than raising, so the app never 500s because of Redis.
"""

import logging

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)

# decode_responses so we work with str; short timeouts so a down Redis fails
# fast instead of hanging a request.
redis_client = redis.Redis.from_url(
    settings.redis_url,
    decode_responses=True,
    socket_connect_timeout=1,
    socket_timeout=1,
)


def cache_get(key: str) -> str | None:
    try:
        return redis_client.get(key)
    except redis.RedisError as exc:
        logger.warning("Redis GET failed (%s): %s", key, exc)
        return None


def cache_set(key: str, value: str, ttl: int | None = None) -> None:
    try:
        redis_client.set(key, value, ex=ttl)
    except redis.RedisError as exc:
        logger.warning("Redis SET failed (%s): %s", key, exc)
