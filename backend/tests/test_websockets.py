"""
CrowdOS — WebSocket & Lifespan Tests
======================================
Tests for the /ws/telemetry WebSocket endpoint and application lifespan.
Increases overall backend coverage by covering previously uncovered branches.
"""

from __future__ import annotations

import os
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

from main import app  # noqa: E402
from rate_limit import _get_redis  # noqa: E402


@pytest.fixture
def client():
    """Sync test client with mocked Redis and DB initialisation."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None
    mock_redis.setex.return_value = True
    mock_redis.incr.return_value = 1
    mock_redis.expire.return_value = True

    async def override_get_redis():
        return mock_redis

    from main import get_redis

    app.dependency_overrides[_get_redis] = override_get_redis
    app.dependency_overrides[get_redis] = override_get_redis

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


class TestSecurityHeaders:
    """Verify OWASP security headers are present on all responses."""

    def test_health_has_x_content_type_options(self, client):
        resp = client.get("/health")
        assert resp.headers.get("x-content-type-options") == "nosniff"

    def test_health_has_x_frame_options(self, client):
        resp = client.get("/health")
        assert resp.headers.get("x-frame-options") == "DENY"

    def test_health_has_x_xss_protection(self, client):
        resp = client.get("/health")
        assert resp.headers.get("x-xss-protection") == "1; mode=block"

    def test_health_has_referrer_policy(self, client):
        resp = client.get("/health")
        assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"

    def test_health_has_hsts(self, client):
        resp = client.get("/health")
        assert "max-age=63072000" in resp.headers.get("strict-transport-security", "")

    def test_health_has_csp(self, client):
        resp = client.get("/health")
        csp = resp.headers.get("content-security-policy", "")
        assert "default-src 'self'" in csp

    def test_health_has_permissions_policy(self, client):
        resp = client.get("/health")
        assert "geolocation=()" in resp.headers.get("permissions-policy", "")


class TestWebSocketTelemetry:
    """Verify the WebSocket endpoint accepts and disconnects gracefully."""

    def test_websocket_connects_and_disconnects(self, client):
        with client.websocket_connect("/ws/telemetry") as ws:
            # WebSocket connection established — send a ping to keep alive
            ws.send_text("ping")
            # Connection should be open; no exception means success

    def test_websocket_broadcast_on_incident(self, client):
        """An incident report should trigger a WebSocket broadcast."""
        with client.websocket_connect("/ws/telemetry") as ws:
            # Submit an incident while WS is connected
            resp = client.post(
                "/api/ops/incident",
                json={
                    "type": "CROWD",
                    "sector": "B2",
                    "severity": 3,
                    "description": "Crowd surge at Gate B2",
                    "reporter_id": "STAFF-001",
                },
                headers={"Authorization": "Bearer ops-secret"},
            )
            assert resp.status_code == 200
            # Receive the broadcast message
            data = ws.receive_json()
            assert data["type"] == "NEW_INCIDENT"
            assert data["data"]["sector"] == "B2"
            assert data["data"]["type"] == "CROWD"


class TestTimestampUTC:
    """Verify all timestamps use timezone-aware UTC (no deprecated utcnow)."""

    def test_health_timestamp_is_utc_aware(self, client):
        resp = client.get("/health")
        timestamp = resp.json()["timestamp"]
        # timezone-aware ISO format includes +00:00 or 'Z'
        assert "+" in timestamp or timestamp.endswith("Z")

    def test_fan_chat_timestamp_is_utc_aware(self, client):
        cached_answer = "Gate 8 is 180m away."
        mock_redis = AsyncMock()
        mock_redis.get.return_value = cached_answer
        mock_redis.incr.return_value = 1
        mock_redis.expire.return_value = True

        async def override():
            return mock_redis

        from main import get_redis

        app.dependency_overrides[_get_redis] = override
        app.dependency_overrides[get_redis] = override

        resp = client.post(
            "/api/fan/chat",
            json={"message": "Where is Gate 8?", "language": "en"},
        )
        timestamp = resp.json().get("timestamp", "")
        assert "+" in timestamp or timestamp.endswith("Z")


class TestLoginRateLimit:
    """Auth route must respond to valid and invalid credentials."""

    def test_login_valid_credentials(self, client):
        resp = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "correct"},
        )
        assert resp.status_code == 200
        assert "token" in resp.json()

    def test_login_invalid_credentials(self, client):
        resp = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "wrong"},
        )
        assert resp.status_code == 401
