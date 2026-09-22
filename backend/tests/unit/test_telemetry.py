"""Unit tests for telemetry ingestion, bot filtering, rate limiting, and GeoIP.

PRD 15 §1-§8 (Tasks 8.11 - 8.16):
- Ingestion: closed taxonomy, sanitization, returns 204 always (or 429 on rate limit).
- Bot filtering: drops bot traffic silently.
- Rate limiting: 60 req/min, 400 evts/min per session.
- Offline GeoIP: loopback/private -> LOCAL, missing DB -> None, zero network calls.
- Security: IP HMAC-hashed, raw IP never stored.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services import telemetry_service
from app.services.geo_service import resolve_ip_location
from app.services.session_service import hash_ip
from app.services.ua_service import is_bot_user_agent


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset telemetry in-memory rate limiter and storage between tests."""
    telemetry_service._request_timestamps.clear()
    telemetry_service._event_timestamps.clear()
    telemetry_service._in_memory_events.clear()
    yield
    telemetry_service._request_timestamps.clear()
    telemetry_service._event_timestamps.clear()
    telemetry_service._in_memory_events.clear()


@pytest.mark.offline
def test_geoip_loopback_and_private_resolve_to_local():
    """T6: Loopback and private IP ranges resolve to LOCAL, never fabricated city."""
    for ip in ["127.0.0.1", "::1", "10.0.0.1", "192.168.1.50", "172.16.0.1"]:
        res = resolve_ip_location(ip)
        assert res["geo_country"] == "LOCAL"
        assert res["geo_city"] is None
        assert res["geo_region"] is None


@pytest.mark.offline
def test_geoip_missing_db_returns_none():
    """T6: Missing GeoLite2 DB returns None/null with zero network calls."""
    # A public IP with no GeoLite2 database on disk should return None for country/city
    res = resolve_ip_location("8.8.8.8")
    assert res["geo_country"] is None
    assert res["geo_city"] is None


@pytest.mark.offline
def test_ip_hmac_hashing():
    """T6: IP is HMAC-hashed using SERVER_SECRET; raw IP is not stored."""
    h1 = hash_ip("192.168.1.1")
    h2 = hash_ip("192.168.1.1")
    h3 = hash_ip("192.168.1.2")
    assert h1 == h2
    assert h1 != h3
    assert len(h1) == 16  # 16-byte HMAC-SHA256 digest for bytea storage


@pytest.mark.offline
def test_bot_detection():
    """T4: Bot user agents are correctly identified and rejected."""
    assert is_bot_user_agent("Googlebot/2.1 (+http://www.google.com/bot.html)")
    assert is_bot_user_agent(
        "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"
    )
    assert is_bot_user_agent("python-requests/2.28.1")
    chrome_ua = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    assert not is_bot_user_agent(chrome_ua)


@pytest.mark.offline
def test_events_endpoint_bot_filtered_returns_204(client):
    """T4: Requests from bots are dropped silently and return 204."""
    payload = {"events": [{"name": "page.view", "path": "/", "p": {}}]}
    headers = {"User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"}
    resp = client.post("/api/v1/events", json=payload, headers=headers)
    assert resp.status_code == 204
    # Ensure no events were ingested
    assert len(telemetry_service._in_memory_events) == 0


@pytest.mark.offline
def test_events_unknown_event_dropped_returns_204(client):
    """T1 / T3: Unknown event names not in closed enum are dropped, still 204."""
    payload = {
        "events": [
            {"name": "unknown.hacker.event", "path": "/", "p": {"key": "val"}},
            {"name": "page.view", "path": "/console", "p": {}},
        ]
    }
    resp = client.post("/api/v1/events", json=payload)
    assert resp.status_code == 204

    # Only page.view should be ingested
    ingested_names = [e["name"] for e in telemetry_service._in_memory_events]
    assert "unknown.hacker.event" not in ingested_names
    assert "page.view" in ingested_names


@pytest.mark.offline
def test_events_rate_limiting_429(client):
    """T5: Rate limiter returns 429 when requests exceed MAX_REQUESTS_PER_MINUTE."""
    # Obtain a session cookie
    init_resp = client.get("/api/v1/session")
    sid_val = init_resp.cookies.get("sid")

    payload = {"events": [{"name": "perf.mark", "path": "/", "p": {}}]}

    # Send 60 requests (allowed)
    for _ in range(60):
        resp = client.post("/api/v1/events", json=payload, cookies={"sid": sid_val})
        assert resp.status_code == 204

    # 61st request should be rejected with 429
    resp_rate_limited = client.post("/api/v1/events", json=payload, cookies={"sid": sid_val})
    assert resp_rate_limited.status_code == 429


@pytest.mark.offline
def test_events_always_204_on_corrupt_payload(client):
    """T1: Endpoint returns 204 ALWAYS even on malformed or empty payloads."""
    resp1 = client.post(
        "/api/v1/events", content="not json", headers={"Content-Type": "application/json"}
    )
    assert resp1.status_code == 204

    resp2 = client.post("/api/v1/events", json={"invalid_key": 123})
    assert resp2.status_code == 204
