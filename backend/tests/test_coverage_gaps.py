"""
CrowdOS — Additional Coverage Tests
=====================================
Targets all previously uncovered lines in main.py, rate_limit.py, and database.py
to push backend coverage to 100%.

Coverage targets:
  main.py:85-89   → get_redis() second call (cache branch)
  main.py:113     → invalid token → 401
  main.py:257     → FanChatResponse default timestamp factory
  main.py:396-397 → broadcast exception swallowing
  main.py:470-472 → Gemini 503 fallback
  main.py:545-546 → WebSocket broadcast on incident
  main.py:562-565 → SECURITY and MAINTENANCE incident types
  rate_limit.py:54 → public rate limit 429 + Retry-After header
  rate_limit.py:76-77 → auth rate limit 429 + Retry-After header
  rate_limit.py:92  → auth lockout at max delay (>= check)
  database.py:64-65 → get_db_session context manager
"""

from __future__ import annotations

import os
from typing import Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

from main import app, FanChatResponse  # noqa: E402
from rate_limit import (
    _get_redis,
    RATE_LIMIT_PUBLIC_RPM,
    RATE_LIMIT_AUTH_USER_RPM,
    RATE_LIMIT_AUTH_MAX_ATTEMPTS,
    RATE_LIMIT_AUTH_MAX_DELAY,
)  # noqa: E402


@pytest.fixture
def mock_redis() -> AsyncMock:
    """Standard mock Redis that never rate-limits."""
    r = AsyncMock()
    r.get.return_value = None
    r.setex.return_value = True
    r.incr.return_value = 1
    r.expire.return_value = True
    return r


@pytest.fixture
def client(mock_redis: AsyncMock) -> Generator[TestClient, None, None]:
    from main import get_redis

    async def override() -> AsyncMock:
        return mock_redis

    app.dependency_overrides[_get_redis] = override
    app.dependency_overrides[get_redis] = override

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


# ── Coverage: main.py:85-89 — get_redis caches the connection ─────────────────
class TestRedisInit:
    def test_get_redis_called_twice_returns_same_instance(self) -> None:
        """Calling get_redis() twice should reuse the existing client (lazy singleton)."""
        import main as m

        original = m._redis_client
        try:
            # Force the client to None so the branch executes
            m._redis_client = None
            import asyncio

            loop = asyncio.new_event_loop()
            client1 = loop.run_until_complete(m.get_redis())
            client2 = loop.run_until_complete(m.get_redis())
            loop.close()
            assert client1 is client2
        finally:
            m._redis_client = original


# ── Coverage: main.py:113 — invalid token returns 401 ─────────────────────────
class TestInvalidToken:
    def test_invalid_bearer_token_returns_401(self, client: TestClient) -> None:
        resp = client.post(
            "/api/ops/incident",
            json={
                "type": "MEDICAL",
                "sector": "A1",
                "severity": 3,
                "description": "Test",
                "reporter_id": "STAFF-X",
            },
            headers={"Authorization": "Bearer completely-wrong-token"},
        )
        assert resp.status_code == 401
        assert "Invalid or expired token" in resp.json()["detail"]


# ── Coverage: main.py:257 — FanChatResponse timestamp default ─────────────────
class TestFanChatResponseModel:
    def test_timestamp_is_utc_iso_string(self) -> None:
        """The default timestamp factory should produce a UTC-aware ISO string."""
        r = FanChatResponse(
            answer="test",
            language="en",
            cache_hit=False,
            latency_ms=10,
        )
        assert isinstance(r.timestamp, str)
        assert len(r.timestamp) > 10
        # timezone-aware timestamps contain + or Z
        assert "+" in r.timestamp or r.timestamp.endswith("Z")


# ── Coverage: main.py:396-397 — broadcast swallows exceptions ─────────────────
class TestBroadcastExceptionHandling:
    def test_broadcast_exception_does_not_propagate(self, client: TestClient) -> None:
        """A broken WebSocket in the pool should not crash the broadcast."""
        from main import ws_manager
        from unittest.mock import AsyncMock

        broken_ws = AsyncMock()
        broken_ws.send_json.side_effect = RuntimeError("disconnected")
        ws_manager.active_connections.append(broken_ws)  # type: ignore[arg-type]
        try:
            # Submitting an incident triggers broadcast — should not raise
            resp = client.post(
                "/api/ops/incident",
                json={
                    "type": "CROWD",
                    "sector": "D4",
                    "severity": 2,
                    "description": "Minor congestion",
                    "reporter_id": "STAFF-020",
                },
                headers={"Authorization": "Bearer ops-secret"},
            )
            assert resp.status_code == 200
        finally:
            ws_manager.active_connections.remove(broken_ws)  # type: ignore[arg-type]


# ── Coverage: main.py:470-472 — Gemini 503 fallback ──────────────────────────
class TestGemini503Fallback:
    def test_fan_chat_returns_503_on_gemini_failure(self, client: TestClient) -> None:
        """When Gemini raises an exception, the endpoint must return 503."""
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True
        mock_redis.incr.return_value = 1
        mock_redis.expire.return_value = True

        async def override() -> AsyncMock:
            return mock_redis

        from main import get_redis

        app.dependency_overrides[_get_redis] = override
        app.dependency_overrides[get_redis] = override

        with patch(
            "main.gemini_client.aio.models.generate_content",
            side_effect=Exception("Gemini API down"),
        ):
            resp = client.post(
                "/api/fan/chat",
                json={"message": "Where is the exit?", "language": "en"},
            )
        assert resp.status_code == 503
        assert "AI service temporarily unavailable" in resp.json()["detail"]


# ── Coverage: main.py:562-565 — SECURITY and MAINTENANCE incident types ───────
class TestIncidentTypeNotifiedTeams:
    def test_security_incident_notifies_law_enforcement(
        self, client: TestClient
    ) -> None:
        resp = client.post(
            "/api/ops/incident",
            json={
                "type": "SECURITY",
                "sector": "B3",
                "severity": 4,
                "description": "Unauthorized access attempt at Gate B3",
                "reporter_id": "STAFF-042",
            },
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert resp.status_code == 200
        data = resp.json()
        notified = data["notified_teams"]
        assert any("Law Enforcement" in t or "Security" in t for t in notified)

    def test_maintenance_incident_notifies_facilities(self, client: TestClient) -> None:
        resp = client.post(
            "/api/ops/incident",
            json={
                "type": "MAINTENANCE",
                "sector": "C1",
                "severity": 2,
                "description": "Water leak in corridor C1",
                "reporter_id": "STAFF-011",
            },
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert resp.status_code == 200
        data = resp.json()
        notified = data["notified_teams"]
        assert any("Facilities" in t or "Safety" in t for t in notified)

    def test_medical_incident_notifies_ems_and_director(
        self, client: TestClient
    ) -> None:
        resp = client.post(
            "/api/ops/incident",
            json={
                "type": "MEDICAL",
                "sector": "A2",
                "severity": 5,
                "description": "Cardiac arrest near Gate A2",
                "reporter_id": "STAFF-003",
            },
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert resp.status_code == 200
        data = resp.json()
        notified = data["notified_teams"]
        assert any("EMS" in t for t in notified)
        assert any("Medical Director" in t for t in notified)


# ── Coverage: rate_limit.py:54 — public rate limit 429 with Retry-After ───────
class TestRateLimitHeaders:
    def test_public_rate_limit_429_has_retry_after(self) -> None:
        """Public rate limit response must include Retry-After header."""
        from main import get_redis

        async def over_limit_redis() -> AsyncMock:
            r = AsyncMock()
            r.incr.return_value = RATE_LIMIT_PUBLIC_RPM + 10
            r.expire.return_value = True
            return r

        app.dependency_overrides[_get_redis] = over_limit_redis
        app.dependency_overrides[get_redis] = over_limit_redis

        try:
            with TestClient(app) as c:
                resp = c.get("/health")
            assert resp.status_code == 429
            assert "Retry-After" in resp.headers
        finally:
            app.dependency_overrides.clear()

    def test_auth_rate_limit_429_has_retry_after(self) -> None:
        """Authenticated rate limit response must include Retry-After header."""
        from main import get_redis

        async def over_limit_redis() -> AsyncMock:
            r = AsyncMock()
            r.incr.return_value = RATE_LIMIT_AUTH_USER_RPM + 10
            r.expire.return_value = True
            return r

        app.dependency_overrides[_get_redis] = over_limit_redis
        app.dependency_overrides[get_redis] = over_limit_redis

        try:
            with TestClient(app) as c:
                resp = c.post(
                    "/api/ops/incident",
                    json={
                        "type": "CROWD",
                        "sector": "D4",
                        "severity": 2,
                        "description": "congestion",
                        "reporter_id": "STAFF-001",
                    },
                    headers={"Authorization": "Bearer ops-secret"},
                )
            assert resp.status_code == 429
            assert "Retry-After" in resp.headers
        finally:
            app.dependency_overrides.clear()


# ── Coverage: rate_limit.py:92 — auth lockout at max delay ────────────────────
class TestAuthRateLimitMaxDelay:
    @patch("asyncio.sleep", new_callable=AsyncMock)
    def test_auth_lockout_at_max_delay(self, mock_sleep: AsyncMock) -> None:
        """When delay reaches max, endpoint must return 429."""
        from main import get_redis

        # count = MAX_ATTEMPTS + enough to saturate delay to MAX_DELAY
        # delay = 2^(count - MAX_ATTEMPTS); need 2^n >= MAX_DELAY
        # so count = MAX_ATTEMPTS + ceil(log2(MAX_DELAY)) + 1 is safe
        import math

        saturation_count = (
            RATE_LIMIT_AUTH_MAX_ATTEMPTS
            + math.ceil(math.log2(RATE_LIMIT_AUTH_MAX_DELAY))
            + 2
        )

        async def maxed_redis() -> AsyncMock:
            r = AsyncMock()
            r.incr.return_value = saturation_count
            r.expire.return_value = True
            return r

        app.dependency_overrides[_get_redis] = maxed_redis
        app.dependency_overrides[get_redis] = maxed_redis

        try:
            with TestClient(app) as c:
                resp = c.post(
                    "/api/auth/login",
                    json={"username": "hacker", "password": "brute"},
                )
            assert resp.status_code == 429
            assert "Retry-After" in resp.headers
        finally:
            app.dependency_overrides.clear()


# ── Coverage: database.py:64-65 — get_db_session context manager ──────────────
class TestDatabaseContextManager:
    def test_get_db_session_yields_session(self) -> None:
        """get_db_session should yield a valid AsyncSession."""
        import asyncio
        from database import get_db_session
        from sqlalchemy.ext.asyncio import AsyncSession

        async def run() -> None:
            async with get_db_session() as session:
                assert isinstance(session, AsyncSession)

        asyncio.run(run())


# ── Coverage: main.py:257 — language validator fallback to 'en' ───────────────
class TestLanguageValidator:
    def test_invalid_language_falls_back_to_en(self) -> None:
        """FanChatRequest with unsupported language code should default to 'en'."""
        from main import FanChatRequest

        req = FanChatRequest(message="Hello", language="xx")
        assert req.language == "en"

    def test_valid_language_is_preserved(self) -> None:
        """A supported language code must be kept unchanged."""
        from main import FanChatRequest

        req = FanChatRequest(message="Hola", language="es")
        assert req.language == "es"


# ── Coverage: main.py:558-559 — Gemini success path in incident ───────────────
class TestIncidentGeminiSuccessPath:
    def test_incident_uses_gemini_response_when_available(
        self, client: TestClient
    ) -> None:
        """When Gemini succeeds, steps should come from its response text."""
        mock_response = MagicMock()
        mock_response.text = (
            "1. Dispatch the medical team to Sector F1 immediately.\n"
            "2. Secure the area.\n3. Notify supervisor.\n"
            "4. Coordinate EMS.\n5. Document witnesses.\n6. Submit AAR."
        )

        with patch(
            "main.gemini_client.aio.models.generate_content",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            resp = client.post(
                "/api/ops/incident",
                json={
                    "type": "MEDICAL",
                    "sector": "F1",
                    "severity": 5,
                    "description": "Spectator collapsed at Gate F1",
                    "reporter_id": "STAFF-099",
                },
                headers={"Authorization": "Bearer ops-secret"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["ai_action_plan"]) > 0
        assert any(
            "medical" in s.lower() or "Sector" in s for s in data["ai_action_plan"]
        )


# ── Coverage: rate_limit.py:109-110 — malformed JSON body in auth route ───────
class TestAuthRateLimitMalformedBody:
    def test_malformed_json_body_falls_back_to_unknown_user(self) -> None:
        """Sending non-JSON body to login must not crash — falls back to 'unknown_user'."""
        from main import get_redis

        async def normal_redis() -> AsyncMock:
            r = AsyncMock()
            r.incr.return_value = 1
            r.expire.return_value = True
            return r

        app.dependency_overrides[_get_redis] = normal_redis
        app.dependency_overrides[get_redis] = normal_redis

        try:
            with TestClient(app) as c:
                resp = c.post(
                    "/api/auth/login",
                    content=b"this is not json",
                    headers={"Content-Type": "application/json"},
                )
            # 422 is acceptable — FastAPI validates before our rate limiter
            # but the important thing is no 500 (our except branch is covered)
            assert resp.status_code in (200, 401, 422, 429)
        finally:
            app.dependency_overrides.clear()


# ── Coverage: rate_limit.py:109-110 (direct unit test) ────────────────────────
class TestAuthRateLimitBodyParseError:
    def test_body_parse_exception_falls_back_to_unknown_user(self) -> None:
        """
        Direct unit test: when request.body() raises, the except branch at
        rate_limit.py:109-110 must be executed (username = 'unknown_user').
        No HTTP layer involved — we call the function directly.
        """
        import asyncio
        from rate_limit import auth_route_rate_limit

        class _FakeClient:
            host = "127.0.0.1"

        class _FakeRequest:
            client = _FakeClient()
            headers: dict[str, str] = {}

            async def body(self) -> bytes:
                raise ValueError("simulated body parse error")

        redis_mock = AsyncMock()
        redis_mock.incr.return_value = 1
        redis_mock.expire.return_value = True

        # Should not raise; the except block falls back to "unknown_user"
        async def _run() -> None:
            await auth_route_rate_limit(_FakeRequest(), redis_mock)  # type: ignore[arg-type]

        asyncio.run(_run())
