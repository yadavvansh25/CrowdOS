"""
CrowdOS — Rate Limiting Module
================================
Configurable, tiered rate limiting for all API endpoints.

Tiers:
  - public_rate_limit        : Per-IP limits on unauthenticated routes
  - authenticated_rate_limit : Looser limits for authenticated users
  - auth_route_rate_limit    : Strict + exponential backoff for auth routes
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
import redis.asyncio as redis

# ── Configurable Rate Limit Thresholds ────────────────────────────────────────
RATE_LIMIT_PUBLIC_RPM: int = int(os.environ.get("RATE_LIMIT_PUBLIC_RPM", "60"))
RATE_LIMIT_AUTH_USER_RPM: int = int(os.environ.get("RATE_LIMIT_AUTH_USER_RPM", "300"))
RATE_LIMIT_AUTH_MAX_ATTEMPTS: int = int(
    os.environ.get("RATE_LIMIT_AUTH_MAX_ATTEMPTS", "5")
)
RATE_LIMIT_AUTH_MAX_DELAY: int = int(os.environ.get("RATE_LIMIT_AUTH_MAX_DELAY", "30"))


async def _get_redis() -> redis.Redis:
    """Lazy import to avoid circular dependency with main.py."""
    from main import get_redis

    return await get_redis()  # type: ignore[return-value]


async def public_rate_limit(
    request: Request,
    redis_client: Annotated[redis.Redis, Depends(_get_redis)],
) -> None:
    """
    Moderate per-IP rate limit for public (unauthenticated) endpoints.

    Limit: RATE_LIMIT_PUBLIC_RPM requests per 60-second sliding window.
    Returns HTTP 429 with Retry-After header on breach.
    """
    client_ip: str = request.client.host if request.client else "unknown_ip"
    key = f"sf:rl:public:{client_ip}"

    count = await redis_client.incr(key)
    if count == 1:
        await redis_client.expire(key, 60)

    if count > RATE_LIMIT_PUBLIC_RPM:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again later.",
            headers={"Retry-After": "60"},
        )


async def authenticated_rate_limit(
    request: Request,
    redis_client: Annotated[redis.Redis, Depends(_get_redis)],
) -> None:
    """
    Looser per-IP + per-token rate limit for authenticated endpoints.

    Limit: RATE_LIMIT_AUTH_USER_RPM requests per 60-second window.
    """
    client_ip: str = request.client.host if request.client else "unknown_ip"
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
            headers={"Retry-After": "60"},
        )


async def auth_route_rate_limit(
    request: Request,
    redis_client: Annotated[redis.Redis, Depends(_get_redis)],
) -> None:
    """
    Strict rate limiting for authentication routes (login, signup, password reset).

    Strategy:
      - Combined per-IP and per-account keying.
      - Exponential backoff delay (2^n seconds) after RATE_LIMIT_AUTH_MAX_ATTEMPTS.
      - Hard 429 rejection once delay reaches RATE_LIMIT_AUTH_MAX_DELAY seconds.
      - 5-minute sliding window to allow legitimate recovery.
    """
    client_ip: str = request.client.host if request.client else "unknown_ip"

    try:
        body_bytes = await request.body()
        body_json: dict[str, object] = json.loads(body_bytes)
        username: str = str(body_json.get("username", "unknown_user"))
    except Exception:
        username = "unknown_user"

    key = f"sf:rl:login:{client_ip}:{username}"

    count = await redis_client.incr(key)
    if count == 1:
        await redis_client.expire(key, 300)

    if count > RATE_LIMIT_AUTH_MAX_ATTEMPTS:
        delay = min(
            2 ** (count - RATE_LIMIT_AUTH_MAX_ATTEMPTS),
            RATE_LIMIT_AUTH_MAX_DELAY,
        )
        await asyncio.sleep(delay)

        if delay >= RATE_LIMIT_AUTH_MAX_DELAY:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many authentication attempts. Please try again later.",
                headers={"Retry-After": str(RATE_LIMIT_AUTH_MAX_DELAY)},
            )
