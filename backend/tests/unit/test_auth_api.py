"""Unit tests for user & admin authentication endpoints (PRD 14 S4/S6)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services import admin_service


@pytest.fixture
def client():
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def test_auth_login_invalid_credentials(client):
    """PRD 14 §6: Bad email or password yields 401."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@chakshu.internal", "password": "wrongpassword"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "INVALID_CREDENTIALS"


def test_auth_login_success_and_logout_lifecycle(client):
    """PRD 14 §4/§6: Successful login sets rotated sid cookie, grants admin access, and clears on logout."""
    email = "chief@chakshu.internal"
    pwd = "secretpassword999"
    admin_service.create_admin_user(email, password=pwd, display_name="Chief Officer")

    # 1. Login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": pwd},
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert data["role"] == "admin"
    assert data["user"]["email"] == email
    assert "sid" in client.cookies

    # 2. Access protected admin overview using session cookie
    overview_resp = client.get("/api/v1/admin/overview")
    assert overview_resp.status_code == 200
    assert "visitors" in overview_resp.json()["kpis"]

    # 3. Check /api/v1/auth/me
    me_resp = client.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["authenticated"] is True
    assert me_resp.json()["role"] == "admin"

    # 4. Logout
    logout_resp = client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 204

    # 5. Access protected admin overview after logout -> 401
    after_resp = client.get("/api/v1/admin/overview")
    assert after_resp.status_code == 401
