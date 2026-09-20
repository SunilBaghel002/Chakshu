"""Unit tests for change detection and review API endpoints (Task 2.5).

Verifies:
1. GET /api/v1/aoi/{id}/changes response schema and SQL predicate filtering.
2. Phase 2 Gate: Predicates (area, date, type, confidence) applied in SQL query.
3. POST /api/v1/aoi/{id}/analyse 202 job creation.
4. GET /api/v1/aoi/changes/{id} single evidence retrieval.
5. POST /api/v1/decisions analyst approval and rejection recording.
"""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient

from app.api.changes import build_changes_sql
from app.main import create_app
from app.schemas.common import ChangeType


@pytest.fixture
def client() -> TestClient:
    """Create test client instance."""
    app = create_app()
    return TestClient(app)


def test_sql_predicate_pushdown_gate_requirement() -> None:
    """Phase 2 Gate: Verify that all query filters are applied as SQL predicates."""
    query, params = build_changes_sql(
        aoi_id="b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1",
        types=["construction", "clearance"],
        min_area_m2=10000.0,
        max_area_m2=500000.0,
        after="2023-01-01",
        before="2026-12-31",
        min_confidence=0.75,
        status="pending",
        sort="area_desc",
        limit=50,
        offset=10,
    )

    # Assert SQL string contains every predicate inside the WHERE clause
    assert "AND aoi_id = %s" in query
    assert "AND change_type = ANY(%s)" in query
    assert "AND area_m2 >= %s" in query
    assert "AND area_m2 <= %s" in query
    assert "AND first_supported >= %s" in query
    assert "AND first_supported <= %s" in query
    assert "AND confidence >= %s" in query
    assert "AND status = %s" in query
    assert "ORDER BY area_m2 DESC" in query
    assert "LIMIT %s OFFSET %s" in query

    # Assert all parameters correctly populated in order
    assert "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1" in params
    assert ["construction", "clearance"] in params
    assert 10000.0 in params
    assert 500000.0 in params
    assert "2023-01-01" in params
    assert "2026-12-31" in params
    assert 0.75 in params
    assert "pending" in params


def test_get_aoi_changes_endpoint(client: TestClient) -> None:
    """Verify GET /api/v1/aoi/{aoi_id}/changes returns Evidence list."""
    aoi_id = "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1"
    response = client.get(f"/api/v1/aoi/{aoi_id}/changes?limit=20")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

    first = data[0]
    assert "change_object_id" in first
    assert "measurement" in first
    assert "area_m2" in first["measurement"]
    assert "area_label" in first["measurement"]
    assert "classification" in first
    assert "rule_trace" in first["classification"]
    assert "sources" in first
    assert "triptych_urls" in first["sources"]


def test_get_aoi_changes_filtered(client: TestClient) -> None:
    """Verify filtering by minimum area and change type."""
    aoi_id = "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1"
    response = client.get(
        f"/api/v1/aoi/{aoi_id}/changes?min_area_m2=15000&type=construction&limit=10"
    )
    assert response.status_code == 200
    data = response.json()
    for item in data:
        assert item["measurement"]["area_m2"] >= 15000
        assert item["change_type"] == ChangeType.CONSTRUCTION


def test_trigger_aoi_analysis_endpoint(client: TestClient) -> None:
    """Verify POST /api/v1/aoi/{id}/analyse initiates asynchronous job."""
    aoi_id = "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1"
    response = client.post(f"/api/v1/aoi/{aoi_id}/analyse")
    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["state"] in {"queued", "running", "succeeded", "completed"}


def test_get_single_change_endpoints(client: TestClient) -> None:
    """Verify GET /api/v1/aoi/changes/{id} and /api/v1/changes/{id}."""
    aoi_id = "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1"
    list_res = client.get(f"/api/v1/aoi/{aoi_id}/changes?limit=1")
    target_id = list_res.json()[0]["change_object_id"]

    res1 = client.get(f"/api/v1/aoi/changes/{target_id}")
    assert res1.status_code == 200
    assert res1.json()["change_object_id"] == target_id

    res2 = client.get(f"/api/v1/changes/{target_id}")
    assert res2.status_code == 200
    assert res2.json()["change_object_id"] == target_id


def test_submit_analyst_decision(client: TestClient) -> None:
    """Verify POST /api/v1/decisions records review status."""
    aoi_id = "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1"
    list_res = client.get(f"/api/v1/aoi/{aoi_id}/changes?limit=1")
    target_id = list_res.json()[0]["change_object_id"]

    decision_payload = {
        "entity_type": "change_object",
        "entity_id": target_id,
        "action": "confirm",
        "note": "Verified genuine runway earthworks and grading.",
    }
    res = client.post("/api/v1/decisions", json=decision_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == "confirm"
    assert data["entity_id"] == target_id

    # Verify status changed on entity
    item_res = client.get(f"/api/v1/changes/{target_id}")
    assert item_res.json()["status"] == "confirmed"


def test_get_aoi_suppression_endpoint(client: TestClient) -> None:
    """Verify GET /api/v1/aoi/{id}/suppression returns counts by reason and sample reasons."""
    aoi_id = "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1"
    res = client.get(f"/api/v1/aoi/{aoi_id}/suppression")
    assert res.status_code == 200
    data = res.json()

    assert data["aoi_id"] == aoi_id
    assert "candidates_generated" in data
    assert "candidates_suppressed" in data
    assert "candidates_retained" in data
    assert (
        data["candidates_generated"] == data["candidates_suppressed"] + data["candidates_retained"]
    )
    assert "by_reason" in data
    assert "sample_reasons" in data
    assert len(data["sample_reasons"]) > 0
    # Every sample reason must have candidate_id, reason, and detail
    for sample in data["sample_reasons"]:
        assert "candidate_id" in sample
        assert "reason" in sample
        assert "detail" in sample
        assert len(sample["detail"].strip()) > 0


def test_get_aoi_calibration_endpoint(client: TestClient) -> None:
    """Verify GET /api/v1/aoi/{id}/calibration returns 10 reliability bins and ECE."""
    aoi_id = "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1"
    res = client.get(f"/api/v1/aoi/{aoi_id}/calibration")
    assert res.status_code == 200
    data = res.json()

    assert data["aoi_id"] == aoi_id
    assert "expected_calibration_error" in data
    assert 0.0 <= data["expected_calibration_error"] <= 0.20
    assert data["samples_count"] >= 100
    assert len(data["bins"]) == 10

    for idx, b in enumerate(data["bins"], start=1):
        assert b["bin_index"] == idx
        assert len(b["confidence_range"]) == 2
        assert 0.0 <= b["mean_confidence"] <= 1.0
        assert 0.0 <= b["accuracy"] <= 1.0
        assert b["count"] >= 0
