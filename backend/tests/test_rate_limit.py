import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from main import app
from rate_limit import RATE_LIMIT_PUBLIC_RPM, RATE_LIMIT_AUTH_MAX_ATTEMPTS


# A simple mock Redis that keeps counts in memory
class MockRedisClient:
    def __init__(self):
        self.store = {}
        self.expires = {}

    async def incr(self, key):
        if key not in self.store:
            self.store[key] = 0
        self.store[key] += 1
        return self.store[key]

    async def expire(self, key, seconds):
        self.expires[key] = seconds
        return True


@pytest.fixture
def mock_redis():
    mock = MockRedisClient()
    return mock


@pytest.fixture
def client():
    return TestClient(app)


@patch("rate_limit._get_redis")
@patch("main.get_redis")
def test_public_rate_limit(mock_main_redis, mock_rl_redis, mock_redis, client):
    mock_main_redis.return_value = mock_redis
    mock_rl_redis.return_value = mock_redis

    # Send requests up to limit
    for i in range(RATE_LIMIT_PUBLIC_RPM):
        response = client.get("/health")
        assert response.status_code == 200, f"Request {i+1} failed"

    # The next one should fail with 429
    response = client.get("/health")
    assert response.status_code == 429
    assert "Rate limit exceeded" in response.json()["detail"]


@patch("asyncio.sleep", new_callable=AsyncMock)
@patch("rate_limit._get_redis")
@patch("main.get_redis")
def test_auth_rate_limit_exponential_backoff(
    mock_main_redis, mock_rl_redis, mock_sleep, mock_redis, client
):
    mock_main_redis.return_value = mock_redis
    mock_rl_redis.return_value = mock_redis

    # Send requests up to limit
    for i in range(RATE_LIMIT_AUTH_MAX_ATTEMPTS):
        response = client.post(
            "/api/auth/login", json={"username": "testuser", "password": "ok"}
        )
        assert response.status_code == 200
        mock_sleep.assert_not_called()

    # Request max_attempts + 1 should trigger backoff sleep(1) but still succeed
    response = client.post(
        "/api/auth/login", json={"username": "testuser", "password": "ok"}
    )
    assert response.status_code == 200
    mock_sleep.assert_called_with(2)  # (count=6, max=5) -> 2^(6-5) = 2

    # Request max_attempts + 2 should trigger backoff sleep(4)
    response = client.post(
        "/api/auth/login", json={"username": "testuser", "password": "ok"}
    )
    mock_sleep.assert_called_with(4)
