"""Verification test ensuring blind vision pipeline does not leak location knowledge (Task 6)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def _find_test_image() -> Path:
    """Locate the San Diego test image across test environments."""
    for base in [Path("data/uploads"), Path(__file__).resolve().parents[3] / "data" / "uploads"]:
        matches = list(base.glob("**/ID6_Banner_San_Diego_PHR1B_20150724.jpg"))
        if matches and matches[0].exists():
            return matches[0]
    pytest.skip("Test image ID6_Banner_San_Diego_PHR1B_20150724.jpg not found in data/uploads")


def test_blind_pipeline_no_location_leak() -> None:
    """Upload San Diego image renamed to img_blind_test.jpg and assert blindness & thresholds."""
    img_file = _find_test_image()
    with open(img_file, "rb") as f:
        img_bytes = f.read()

    app = create_app()
    client = TestClient(app)

    # 1. Upload renamed as img_blind_test.jpg
    upload_resp = client.post(
        "/api/v1/uploads",
        files={"file": ("img_blind_test.jpg", img_bytes, "image/jpeg")},
        data={"gsd_m": "0.5"},
    )
    assert upload_resp.status_code == 202
    upload_id = upload_resp.json()["id"]

    # 2. Retrieve detection with ?mode=reconcile
    det_resp = client.get(f"/api/v1/uploads/{upload_id}/detections?mode=reconcile")
    assert det_resp.status_code == 200
    det_data = det_resp.json()

    # (b) Assert full detection JSON contains NONE of forbidden landmark/place names
    raw_json_lower = json.dumps(det_data).lower()
    forbidden_terms = [
        "san diego",
        "qualcomm",
        "mission valley",
        "bajra",
        "stadium named",
    ]
    for term in forbidden_terms:
        assert term not in raw_json_lower, (
            f"Forbidden location term '{term}' leaked in detection JSON!"
        )

    # (c) Assert landcover bare < 40 and built > 40
    coverage_dict = {item["label"]: item["pct"] for item in det_data["coverage"]["by_class"]}
    assert coverage_dict["bare"] < 40.0, f"Bare percentage {coverage_dict['bare']} is not < 40"
    assert coverage_dict["built"] > 40.0, f"Built percentage {coverage_dict['built']} is not > 40"

    # Also verify merged/blind landcover if present
    if det_data.get("merged_landcover_pct"):
        merged = det_data["merged_landcover_pct"]
        assert merged.get("bare", 0.0) < 40.0
        assert merged.get("built", 0.0) > 40.0

    # (d) Assert water polygons count < 6 and total water area > 500 m2
    water_dets = [d for d in det_data["detections"] if d["label"] == "water"]
    assert len(water_dets) < 6, f"Water polygons count {len(water_dets)} is not < 6"
    total_water_area = sum(d.get("area_m2") or 0.0 for d in water_dets)
    assert total_water_area > 500.0, f"Total water area {total_water_area} m2 is not > 500 m2"
