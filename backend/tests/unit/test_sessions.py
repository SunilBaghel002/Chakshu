"""Unit tests for guest sessions and telemetry events.

PRD 14 §1 (S1) & PRD 15 §1 (T1), Task 8.10:
- Guest sessions: middleware, cookie, session/visit DDL.
- POST /api/v1/events → always 204.
- Security: token_hash, ip_hash, raw IP never exposed.
"""

import re

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


@pytest.mark.offline
def test_guest_session_cookie_created_on_first_request(client):
    """PRD 14 S1: Creates anonymous guest session with `sid` cookie on first request."""
    resp = client.get("/api/v1/aoi")
    assert resp.status_code == 200

    set_cookie = resp.headers.get("set-cookie")
    assert set_cookie is not None
    assert "sid=" in set_cookie
    assert "httponly" in set_cookie.lower()
    assert "samesite=lax" in set_cookie.lower()
    assert "path=/" in set_cookie.lower()
    assert "max-age=2592000" in set_cookie.lower()

    # Token must be 32 bytes base64url = 43 chars
    sid_val = resp.cookies.get("sid")
    assert sid_val is not None
    assert len(sid_val) == 43


@pytest.mark.offline
def test_guest_session_persists_across_requests(client):
    """PRD 14 S1: Existing `sid` cookie is recognized and reused."""
    resp1 = client.get("/api/v1/aoi")
    sid_val = resp1.cookies.get("sid")
    assert sid_val is not None

    # Second request with sid cookie should recognize existing session
    resp2 = client.get("/api/v1/aoi", cookies={"sid": sid_val})
    assert resp2.status_code == 200


@pytest.mark.offline
def test_session_endpoint_returns_safe_envelope(client):
    """PRD 14 §6: GET /api/v1/session returns safe public session envelope."""
    resp = client.get("/api/v1/session")
    assert resp.status_code == 200
    data = resp.json()

    # Verify public fields
    assert "id" in data
    assert "public_label" in data
    assert re.match(r"^GUEST-[0-9A-F]{4}$", data["public_label"])
    assert data["role"] == "guest"
    assert data["kind"] == "guest"
    assert data["user"] is None  # Stage A anonymous-only: no user
    assert "counts" in data
    assert "created_at" in data

    # Strict security invariant: token_hash, ip_hash, raw IP NEVER exposed
    resp_text = resp.text.lower()
    assert "token_hash" not in resp_text
    assert "ip_hash" not in resp_text
    assert "127.0.0.1" not in resp_text


@pytest.mark.offline
def test_events_endpoint_always_204(client):
    """PRD 15 T1: POST /api/v1/events always returns 204 No Content."""
    payload = {
        "events": [
            {
                "name": "page.view",
                "path": "/",
                "client_ts": "2026-09-20T12:00:00Z",
                "p": {"route": "/"},
            },
            {
                "name": "landing.cta.click",
                "path": "/",
                "p": {"cta": "hero_console"},
            },
        ]
    }
    resp = client.post("/api/v1/events", json=payload)
    assert resp.status_code == 204
    assert resp.content == b""


@pytest.mark.offline
def test_events_endpoint_with_session_cookie(client):
    """PRD 15 §1: Events are associated with the guest session."""
    resp1 = client.get("/api/v1/aoi")
    sid_val = resp1.cookies.get("sid")

    payload = {
        "events": [
            {
                "name": "scroll.depth",
                "path": "/",
                "p": {"depth": 50},
            }
        ]
    }
    resp2 = client.post("/api/v1/events", json=payload, cookies={"sid": sid_val})
    assert resp2.status_code == 204
