"""Unit tests for AOI and Scene API endpoints (Task 1.7)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app

client = TestClient(create_app())


def test_list_aois() -> None:
    """Test retrieving list of Areas of Interest."""
    res = client.get("/api/v1/aoi")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1
    # Check Jewar AOI exists in fixture list
    jewar = next(
        (item for item in data["items"] if "Jewar" in item["name"]),
        None,
    )
    assert jewar is not None
    assert jewar["utm_epsg"] == 32643


def test_get_aoi_by_id() -> None:
    """Test fetching a specific AOI."""
    res = client.get("/api/v1/aoi/b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1")
    assert res.status_code == 200
    aoi = res.json()
    assert aoi["id"] == "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1"
    assert "Noida" in aoi["name"]


def test_create_aoi() -> None:
    """Test creating a new AOI with automated UTM EPSG derivation."""
    payload = {
        "name": "Delhi Central Ridge",
        "geom": {
            "type": "Polygon",
            "coordinates": [
                [
                    [77.18, 28.58],
                    [77.22, 28.58],
                    [77.22, 28.62],
                    [77.18, 28.62],
                    [77.18, 28.58],
                ]
            ],
        },
    }
    res = client.post("/api/v1/aoi", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["name"] == "Delhi Central Ridge"
    assert created["utm_epsg"] == 32643  # 77°E is in UTM zone 43N
    assert "id" in created


def test_trigger_aoi_ingest() -> None:
    """Test triggering asynchronous scene ingestion for an AOI."""
    res = client.post("/api/v1/aoi/b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1/ingest")
    assert res.status_code == 202
    job = res.json()
    assert "job_id" in job
    assert job["job_id"].startswith("j_")
    assert job["state"] in {"queued", "running", "succeeded"}


def test_list_scenes_for_aoi() -> None:
    """Test querying multi-temporal scenes for an AOI."""
    res = client.get("/api/v1/aoi/b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1/scenes")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] >= 1

    # Test filtering with usable_only
    usable_res = client.get(
        "/api/v1/aoi/b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1/scenes?usable_only=true"
    )
    assert usable_res.status_code == 200
    usable_data = usable_res.json()
    for s in usable_data["items"]:
        assert s["usable"] is True


def test_get_scene_by_id() -> None:
    """Test fetching metadata for a single scene."""
    res = client.get("/api/v1/scenes/S2B_43RCU_20240609_0_L2A")
    assert res.status_code == 200
    scene = res.json()
    assert scene["id"] == "S2B_43RCU_20240609_0_L2A"
    assert scene["gsd_m"] == 10.0


def test_aoi_not_found() -> None:
    """Test 404 error on missing AOI."""
    res = client.get("/api/v1/aoi/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404
    data = res.json()
    assert data["error"]["code"] == "NOT_FOUND"
