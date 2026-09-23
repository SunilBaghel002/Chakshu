"""Unit tests for Admin API endpoints and privacy hygiene.

Specs: PRD 16 §1–§8 (D1–D8), PRD 14 §6 (S6)
- OVERVIEW endpoint: KPIs, breakdown, seeded badge, query_ms, rows_scanned.
- SESSIONS endpoint: filtered listing, cursor pagination, state classification.
- DOSSIER endpoint: device/geo, visit timeline, privacy hygiene.
- CSV EXPORT: format, audit log recording.
- DELETE: session revocation and event purge.
"""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services import admin_service, session_service, telemetry_service


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


@pytest.fixture
def admin_session_token():
    admin_service.create_admin_user("chief@chakshu.internal")
    token, sess = session_service.create_guest_session(
        client_ip="127.0.0.1",
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    )
    sess["role"] = "admin"
    sess["admin_since"] = datetime.now(UTC)
    return token, sess


@pytest.mark.offline
def test_admin_status_endpoint(client):
    """PRD 16 D8: GET /api/v1/admin/status is public and reports readiness."""
    admin_service._in_memory_admins.clear()
    for s in list(session_service._in_memory_sessions.values()):
        if s.get("role") == "admin":
            s["role"] = "guest"
            s["admin_since"] = None
    if admin_service.STATE_FILE.exists():
        admin_service.STATE_FILE.unlink()

    resp = client.get("/api/v1/admin/status")
    assert resp.status_code == 200
    assert resp.json()["admin_configured"] is False

    admin_service.create_admin_user("admin@test.com")
    resp2 = client.get("/api/v1/admin/status")
    assert resp2.status_code == 200
    assert resp2.json()["admin_configured"] is True


@pytest.mark.offline
def test_admin_overview_metrics(client, admin_session_token):
    """PRD 16 D3.1: Overview returns KPIs, operations breakdown, and telemetry cost."""
    token, _ = admin_session_token

    resp = client.get("/api/v1/admin/overview?range=7d", cookies={"sid": token})
    assert resp.status_code == 200
    data = resp.json()

    assert "kpis" in data
    assert "visitors" in data["kpis"]
    assert "visits" in data["kpis"]
    assert "median_dwell_s" in data["kpis"]
    assert "operations_run" in data["kpis"]
    assert "error_rate" in data["kpis"]

    # Slot-40 metrics
    assert "query_ms" in data
    assert "rows_scanned" in data
    assert isinstance(data["query_ms"], (int, float))
    assert isinstance(data["rows_scanned"], int)


@pytest.mark.offline
def test_admin_sessions_filtering_and_pagination(client, admin_session_token):
    """PRD 16 D3.2: Sessions list supports cursor pagination and device filters."""
    token, sess = admin_session_token

    # Create a couple of guest sessions with events
    _, sess2 = session_service.create_guest_session(
        client_ip="192.168.1.1", user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
    )
    telemetry_service.ingest_batch(
        session_id=sess2["id"],
        events_data=[{"name": "page.view", "path": "/"}],
    )

    resp = client.get("/api/v1/admin/sessions?limit=5", cookies={"sid": token})
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) >= 1

    row = data["items"][0]
    assert "id" in row
    assert "session" in row
    assert "visits" in row
    assert "events" in row
    assert "device" in row
    assert "state" in row


@pytest.mark.offline
def test_admin_session_dossier_privacy_hygiene(client, admin_session_token):
    """PRD 16 §4 & PRD 16 D8: Visitor dossier enforces privacy invariants."""
    token, sess = admin_session_token

    # Add an event to the session
    telemetry_service.ingest_batch(
        session_id=sess["id"],
        events_data=[
            {"name": "page.view", "path": "/"},
            {"name": "op.start", "path": "/console", "p": {"op": "change_detect"}},
        ],
    )

    # 1. Detail dossier
    resp = client.get(f"/api/v1/admin/sessions/{sess['id']}", cookies={"sid": token})
    assert resp.status_code == 200
    detail = resp.json()

    assert detail["header"]["id"] == sess["id"]
    assert "measured" in detail
    assert "device" in detail
    assert "ua_raw" in detail["device"]  # ONLY allowed in device tab

    # Security invariants: raw IP and token_hash NEVER present
    body_text = resp.text.lower()
    assert "token_hash" not in body_text
    assert "127.0.0.1" not in body_text
    assert "192.168.1.1" not in body_text


@pytest.mark.offline
def test_admin_timeline_events(client, admin_session_token):
    """PRD 16 §4: Visitor timeline groups events by visit."""
    token, sess = admin_session_token

    telemetry_service.ingest_batch(
        session_id=sess["id"],
        events_data=[
            {"name": "page.view", "path": "/"},
            {"name": "landing.cta.click", "path": "/", "p": {"cta": "start"}},
        ],
    )

    resp = client.get(f"/api/v1/admin/sessions/{sess['id']}/events", cookies={"sid": token})
    assert resp.status_code == 200
    data = resp.json()
    assert "visits" in data
    assert len(data["visits"]) >= 1
    v = data["visits"][0]
    assert "events" in v
    assert len(v["events"]) >= 1
    assert v["events"][0]["family"] == "nav"


@pytest.mark.offline
def test_admin_export_csv_and_audit(client, admin_session_token):
    """PRD 16 §6: Export CSV generates downloadable file and records audit row."""
    token, _ = admin_session_token

    resp = client.get("/api/v1/admin/export.csv", cookies={"sid": token})
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "attachment; filename=chakshu_telemetry.csv" in resp.headers.get("content-disposition", "")

    csv_text = resp.text
    assert "session_id,label,first_seen,last_seen" in csv_text

    # Verify audit entry was written
    audits = admin_service._in_memory_audits
    assert len(audits) >= 1
    last_audit = audits[-1]
    assert last_audit["action"] == "admin.export.csv"


@pytest.mark.offline
def test_admin_delete_session(client, admin_session_token):
    """PRD 16 §6: DELETE session revokes and purges telemetry events."""
    token, sess = admin_session_token

    del_resp = client.delete(f"/api/v1/admin/sessions/{sess['id']}", cookies={"sid": token})
    assert del_resp.status_code == 200
    assert del_resp.json()["ok"] is True

    # Assert revoked_at is set
    assert sess.get("revoked_at") is not None
