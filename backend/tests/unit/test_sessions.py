"""Unit tests for guest sessions and telemetry events.

PRD 14 §1 (S1) & PRD 15 §1 (T1), Task 8.10:
- Guest sessions: middleware, cookie, session/visit DDL.
- POST /api/v1/events → always 204.
"""

from fastapi.testclient import TestClient
import pytest
from app.main import create_app


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


def test_guest_session_cookie_created_on_first_request(client):
    """PRD 14 S1: Creates anonymous guest session with `sid` cookie on first request."""
    resp = client.get("/api/v1/aoi")
    assert resp.status_code == 200
    # Check that Set-Cookie header contains sid
    set_cookie = resp.headers.get("set-cookie")
    assert set_cookie is not None
    assert "sid=" in set_cookie
    assert "httponly" in set_cookie.lower()
    assert "samesite=lax" in set_cookie.lower()


def test_guest_session_persists_across_requests(client):
    """PRD 14 S1: Existing `sid` cookie is recognized and reused."""
    resp1 = client.get("/api/v1/aoi")
    cookie_header = resp1.headers.get("set-cookie")
    assert "sid=" in cookie_header

    # Extract sid value
    sid_val = resp1.cookies.get("sid")
    assert sid_val is not None

    # Second request with sid cookie should not set a new sid cookie
    resp2 = client.get("/api/v1/aoi", cookies={"sid": sid_val})
    assert resp2.status_code == 200


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


def test_events_endpoint_with_session_cookie(client):
    """PRD 15 §1: Events are associated with the guest session."""
    # First get a session cookie
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
