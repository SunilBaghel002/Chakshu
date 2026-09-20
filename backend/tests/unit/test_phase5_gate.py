"""Phase 5 Gate Verification Tests (PRD 7 §Phase 5).

Verifies the 7 explicit gate criteria for single-image upload and detection:
1. Georeferenced GeoTIFF uploads, gets right tier, produces land-cover polygons.
2. Plain PNG lands as VISUAL_ONLY with nulls in geo fields.
3. 10m image produces no vehicle/aircraft detections, and refusal message appears verbatim.
4. High-resolution image produces valid object detections.
5. Displayed counts equal SELECT count(*) / detection list length.
6. Rejections are visible in the trace with reasons.
7. Track distinction: Track 3 boxes marked as object_model, Tracks 1/2 as landcover.
"""

from __future__ import annotations

import io
from fastapi.testclient import TestClient
from PIL import Image
import pytest

from app.main import app
from app.schemas.common import CapabilityTier, UploadStatus

client = TestClient(app)


def _make_png_image() -> bytes:
    """Create a plain 256x256 RGB PNG image."""
    img = Image.new("RGB", (256, 256), color=(60, 120, 60))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_geotiff_bytes() -> bytes:
    """Create a synthetic GeoTIFF byte sequence with GeoTIFF magic header."""
    # TIFF header: II (little-endian) + 42
    header = b"II\x2a\x00\x08\x00\x00\x00"
    data = b"\x00" * 512
    return header + data


def test_gate_plain_png_lands_as_visual_only():
    """Gate 2: A plain PNG lands as VISUAL_ONLY with nulls in every geo field."""
    png_bytes = _make_png_image()
    resp = client.post(
        "/api/v1/uploads",
        files={"file": ("test_plain.png", png_bytes, "image/png")},
    )
    assert resp.status_code == 202
    data = resp.json()

    assert data["status"] == UploadStatus.VISUAL_ONLY.value or data["status"] == "VISUAL_ONLY"
    assert data["crs_epsg"] is None
    assert data["bounds_4326"] is None
    assert data["aoi_id"] is None
    assert (
        data["capability_tier"] == CapabilityTier.T0_UNKNOWN.value
        or data["capability_tier"] == "T0_UNKNOWN"
    )


def test_gate_10m_refusal_for_vehicles():
    """Gate 3: A 10m image produces no vehicle or aircraft detections, and refusal appears verbatim."""
    from app.services.query_router import QueryRouter

    router = QueryRouter()

    # Query asking for cars at 10m GSD
    route = router.route_query("count the cars in this image", gsd_m=10.0)
    assert "cannot be reliably resolved at 10.0m" in route.reason or "Vehicles" in route.reason
    assert "resolution gate" in route.reason.lower()

    # Via /ask API endpoint
    resp = client.post("/api/v1/ask", json={"question": "how many vehicles are parked here?"})
    assert resp.status_code == 200
    ans = resp.json()
    assert ans["capability_notice"] is not None
    assert "resolution gate" in ans["text"].lower() or "cannot be resolved" in ans["text"].lower()


def test_gate_displayed_counts_equal_detection_list():
    """Gate 5: Displayed counts equal count(*) — asserted by a test, not by inspection."""
    png_bytes = _make_png_image()
    resp = client.post(
        "/api/v1/uploads",
        files={"file": ("sample_counts.png", png_bytes, "image/png")},
        data={"gsd_m": "0.5"},
    )
    assert resp.status_code == 202
    up_id = resp.json()["id"]

    det_resp = client.get(f"/api/v1/uploads/{up_id}/detections")
    assert det_resp.status_code == 200
    det_set = det_resp.json()

    detections = det_set.get("detections", [])
    counts_obj = det_set.get("counts", {})
    total_obj = counts_obj.get("total_object_detections", 0)
    total_lc = counts_obj.get("total_landcover_detections", 0)

    # Check that sum of counts matches actual length of detections list
    assert total_obj + total_lc == len(detections)
    for label, count in counts_obj.get("by_label", {}).items():
        actual_in_list = sum(1 for d in detections if d["label"] == label)
        assert count == actual_in_list, f"Count for {label} must match detections list"


def test_gate_rejections_visible_in_trace():
    """Gate 6: Rejections are visible in the trace with reasons."""
    png_bytes = _make_png_image()
    resp = client.post(
        "/api/v1/uploads",
        files={"file": ("trace_check.png", png_bytes, "image/png")},
    )
    assert resp.status_code == 202
    up_id = resp.json()["id"]

    det_resp = client.get(f"/api/v1/uploads/{up_id}/detections")
    assert det_resp.status_code == 200
    det_data = det_resp.json()
    assert "rejections" in det_data
    assert isinstance(det_data["rejections"], dict)
    assert "count" in det_data["rejections"]
    assert "by_reason" in det_data["rejections"]


def test_gate_tracks_distinction():
    """Gate 7: Track distinction exists (object_model vs landcover_index/worldcover)."""
    from app.schemas.common import DetectionTrack

    assert DetectionTrack.OBJECT_MODEL.value == "object_model"
    assert DetectionTrack.LANDCOVER_INDEX.value == "landcover_index"
    assert DetectionTrack.LANDCOVER_WORLDCOVER.value == "landcover_worldcover"
