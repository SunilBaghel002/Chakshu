"""Unit tests for admin authorization dependency and role gates.

Specs: PRD 14 §4, §6 (S4, S6), PRD 16 §8 (D8)
- Fresh DB / unconfigured state: 503 NoAdminConfiguredError
- Guest session: 401 AuthRequiredError
- Analyst session: 403 RoleRequiredError
- Admin session (>12h lifetime): 401 SessionExpiredError
- Admin session (>60m idle): 401 SessionExpiredError
- Active admin: 200 OK
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services import admin_service, session_service


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


from app.settings import settings


@pytest.fixture(autouse=True)
def clean_admin_state():
    """Reset admin state before each test."""
    orig_email = getattr(settings, "ADMIN_EMAIL", "")
    orig_pwd = getattr(settings, "ADMIN_PASSWORD", "")
    settings.ADMIN_EMAIL = ""
    settings.ADMIN_PASSWORD = ""
    admin_service._in_memory_admins.clear()
    for s in list(session_service._in_memory_sessions.values()):
        if s.get("role") == "admin":
            s["role"] = "guest"
            s["admin_since"] = None
    if admin_service.STATE_FILE.exists():
        try:
            admin_service.STATE_FILE.unlink()
        except Exception:
            pass
    yield
    settings.ADMIN_EMAIL = orig_email
    settings.ADMIN_PASSWORD = orig_pwd
    admin_service._in_memory_admins.clear()
    for s in list(session_service._in_memory_sessions.values()):
        if s.get("role") == "admin":
            s["role"] = "guest"
            s["admin_since"] = None
    if admin_service.STATE_FILE.exists():
        try:
            admin_service.STATE_FILE.unlink()
        except Exception:
            pass


@pytest.mark.offline
def test_no_admin_configured_returns_503(client):
    """PRD 14 §4 & PRD 16 D8: Fresh database returns 503 NO ADMIN CONFIGURED."""
    # Ensure no admin configured
    assert not admin_service.has_any_admin()

    resp = client.get("/api/v1/admin/overview")
    assert resp.status_code == 503
    data = resp.json()
    assert data["error"]["code"] == "NO_ADMIN_CONFIGURED"
    assert "RUN scripts/make_admin.py" in data["error"]["message"]


@pytest.mark.offline
def test_guest_caller_returns_401(client):
    """PRD 14 S4: Guest session hitting admin route returns 401 AuthRequiredError."""
    # Configure an admin in the system
    admin_service.create_admin_user("root@chakshu.internal")
    assert admin_service.has_any_admin()

    # Create standard guest session
    token, guest_sess = session_service.create_guest_session()
    assert guest_sess["role"] == "guest"

    resp = client.get("/api/v1/admin/overview", cookies={"sid": token})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "AUTH_REQUIRED"


@pytest.mark.offline
def test_analyst_caller_returns_403(client):
    """PRD 14 S4: Analyst session hitting admin route returns 403 RoleRequiredError."""
    admin_service.create_admin_user("root@chakshu.internal")

    token, sess = session_service.create_guest_session()
    sess["role"] = "analyst"
    sess["user_id"] = str(uuid.uuid4())

    resp = client.get("/api/v1/admin/overview", cookies={"sid": token})
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "ROLE_REQUIRED"


@pytest.mark.offline
def test_admin_caller_succeeds(client):
    """PRD 14 S4: Active admin session succeeds with 200 OK."""
    admin_service.create_admin_user("root@chakshu.internal")

    token, sess = session_service.create_guest_session()
    sess["role"] = "admin"
    sess["admin_since"] = datetime.now(UTC)

    resp = client.get("/api/v1/admin/overview", cookies={"sid": token})
    assert resp.status_code == 200
    data = resp.json()
    assert "kpis" in data
    assert "ops" in data
    assert "query_ms" in data
    assert "rows_scanned" in data


@pytest.mark.offline
def test_admin_session_expired_after_12h(client):
    """PRD 14 §4: Admin session older than 12 hours is rejected with 401."""
    admin_service.create_admin_user("root@chakshu.internal")

    token, sess = session_service.create_guest_session()
    sess["role"] = "admin"
    sess["admin_since"] = datetime.now(UTC) - timedelta(hours=13)

    resp = client.get("/api/v1/admin/overview", cookies={"sid": token})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "SESSION_EXPIRED"


@pytest.mark.offline
def test_admin_session_idle_timeout_after_60m(client):
    """PRD 14 §4: Admin idle for > 60 minutes is rejected with 401."""
    admin_service.create_admin_user("root@chakshu.internal")

    token, sess = session_service.create_guest_session()
    sess["role"] = "admin"
    sess["admin_since"] = datetime.now(UTC) - timedelta(minutes=70)
    # Simulate last seen 65 minutes ago
    sess["last_seen_at"] = datetime.now(UTC) - timedelta(minutes=65)

    resp = client.get("/api/v1/admin/overview", cookies={"sid": token})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "SESSION_EXPIRED"
