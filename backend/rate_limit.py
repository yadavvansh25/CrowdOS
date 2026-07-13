import asyncio
import os
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
import redis.asyncio as redis

# Configurable limits
RATE_LIMIT_PUBLIC_RPM = int(os.environ.get("RATE_LIMIT_PUBLIC_RPM", "60"))
RATE_LIMIT_AUTH_USER_RPM = int(os.environ.get("RATE_LIMIT_AUTH_USER_RPM", "300"))
RATE_LIMIT_AUTH_MAX_ATTEMPTS = int(os.environ.get("RATE_LIMIT_AUTH_MAX_ATTEMPTS", "5"))
RATE_LIMIT_AUTH_MAX_DELAY = int(os.environ.get("RATE_LIMIT_AUTH_MAX_DELAY", "30"))


async def _get_redis():
    from main import get_redis

    return await get_redis()


async def public_rate_limit(
    request: Request, redis_client: Annotated[redis.Redis, Depends(_get_redis)]
):
    """Moderate limits on public endpoints per IP."""
    client_ip = request.client.host if request.client else "unknown_ip"
    key = f"sf:rl:public:{client_ip}"

    count = await redis_client.incr(key)
    if count == 1:
        await redis_client.expire(key, 60)

    if count > RATE_LIMIT_PUBLIC_RPM:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again later.",
        )


async def authenticated_rate_limit(
    request: Request, redis_client: Annotated[redis.Redis, Depends(_get_redis)]
):
    """Looser limits for authenticated users per IP or Role."""
    client_ip = request.client.host if request.client else "unknown_ip"
    auth_header = request.headers.get("Authorization", "no_auth")
    auth_id = hash(auth_header)

    key = f"sf:rl:authuser:{client_ip}:{auth_id}"

    count = await redis_client.incr(key)
    if count == 1:
        await redis_client.expire(key, 60)

    if count > RATE_LIMIT_AUTH_USER_RPM:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded for authenticated endpoint.",
        )


async def auth_route_rate_limit(
    request: Request, redis_client: Annotated[redis.Redis, Depends(_get_redis)]
):
    """
    Stricter limits on authentication routes (e.g. login).
    Uses a combination of per-IP and per-account.
    Implements exponential backoff rather than a hard lockout.
    """
    client_ip = request.client.host if request.client else "unknown_ip"

    try:
        body_bytes = await request.body()
        import json

        body_json = json.loads(body_bytes)
        username = body_json.get("username", "unknown_user")
    except Exception:
        username = "unknown_user"

    key = f"sf:rl:login:{client_ip}:{username}"

    count = await redis_client.incr(key)
    if count == 1:
        await redis_client.expire(key, 300)

    if count > RATE_LIMIT_AUTH_MAX_ATTEMPTS:
        delay = min(
            2 ** (count - RATE_LIMIT_AUTH_MAX_ATTEMPTS), RATE_LIMIT_AUTH_MAX_DELAY
        )
        await asyncio.sleep(delay)

        if delay == RATE_LIMIT_AUTH_MAX_DELAY:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many authentication attempts. Please try again later.",
            )
