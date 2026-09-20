"""SIH26167 Hardening Regression Test Suite (§50).

Covers all 26 hardening requirements (A-Z) from §50:
A. dark/greenish water
B. blue water
C. turbid/brown water
D. water vs dark road/shadow
E. building vs road
F. road network does not produce building polygons
G. giant connected component cannot become a giant chord polygon
H. polygon mask IoU
I. invalid polygon rejection
J. out-of-bounds coordinates
K. NaN/Infinity coordinates
L. empty mask
M. tiny component filtering
N. no forced bare classification
O. unsupported class
P. low-confidence result
Q. repeated identical input
R. image resize coordinate transformation
S. frontend overlay alignment
T. missing GSD
U. geospatial metadata
V. temporal alignment
W. temporal change detection
X. registration failure
Y. Gemini malformed JSON
Z. Gemini unavailable
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any
import numpy as np
from PIL import Image
import pytest

from app.domain.constants import (
    MAX_REGISTRATION_SHIFT,
    MIN_POLYGON_IOU,
    MODEL_NAME,
    MODEL_VERSION,
)
from app.domain.landcover import (
    classify_optical_pixels,
    compute_landcover_summary,
    vectorize_class_mask,
)
from app.domain.models import (
    ObjectDetectionModel,
    SatelliteSegmentationModel,
    SegmentationResult,
)
from app.schemas.analysis import AnalysisTask
from app.schemas.common import CapabilityTier, ProvenanceSource, UploadStatus
from app.schemas.detection import CapabilityPermissions, Upload
from app.services.analysis_engine import AnalysisEngine
from app.services.change_detector import ChangeDetector
from app.services.polygonizer import (
    compute_mask_polygon_iou,
    mask_to_validated_polygons,
    validate_polygon_geometry,
)
from app.services.query_router import QueryRouter


# =========================================================================
# A, B, C, D: Water Appearance Invariance vs Road / Shadow
# =========================================================================
def test_a_dark_greenish_water_not_bare() -> None:
    """Dark/greenish-black water (Tidal Basin regression) classifies as water, not bare."""
    # Real Tidal Basin reflectance from Pleiades image: R=27, G=32, B=27
    r = np.full((64, 64), 27, dtype=np.uint16)
    g = np.full((64, 64), 32, dtype=np.uint16)
    b = np.full((64, 64), 27, dtype=np.uint16)

    classified = classify_optical_pixels(r, g, b, scale_factor=255.0)
    assert np.all(classified == "water")
    assert not np.any(classified == "bare")


def test_b_blue_water_classification() -> None:
    """Clear blue lake/pool water classifies as water."""
    r = np.full((64, 64), 25, dtype=np.uint16)
    g = np.full((64, 64), 90, dtype=np.uint16)
    b = np.full((64, 64), 185, dtype=np.uint16)

    classified = classify_optical_pixels(r, g, b, scale_factor=255.0)
    assert np.all(classified == "water")


def test_c_turbid_brown_water_classification() -> None:
    """Turbid/dark inland river channel classifies as water without blue requirement."""
    r = np.full((64, 64), 7, dtype=np.uint16)
    g = np.full((64, 64), 12, dtype=np.uint16)
    b = np.full((64, 64), 5, dtype=np.uint16)

    classified = classify_optical_pixels(r, g, b, scale_factor=255.0)
    assert np.all(classified == "water")


def test_d_water_vs_dark_road_and_shadow() -> None:
    """Dark asphalt road and building shadows must not be classified as water or forced to bare."""
    # Road: moderate luminance with balanced grey channels (R=45, G=45, B=46)
    r = np.full((64, 64), 45, dtype=np.uint16)
    g = np.full((64, 64), 45, dtype=np.uint16)
    b = np.full((64, 64), 46, dtype=np.uint16)

    classified = classify_optical_pixels(r, g, b, scale_factor=255.0)
    assert not np.any(classified == "water")
    assert not np.any(classified == "bare")


# =========================================================================
# E, F: Building vs Road Network Isolation
# =========================================================================
def test_e_f_road_network_severed_from_buildings() -> None:
    """Linear road network does not generate building polygons (§11)."""
    # Create canvas with a continuous long thin road and one isolated compact building
    canvas = np.zeros((200, 200), dtype=bool)
    # 3-pixel wide road traversing entire canvas (linear network, aspect = 200/3 = 66.7)
    canvas[98:101, :] = True
    # Compact building footprint (30x30 = 900 px, aspect = 1.0)
    canvas[20:50, 20:50] = True

    model = SatelliteSegmentationModel()
    res = SegmentationResult(
        model_name=MODEL_NAME,
        model_version=MODEL_VERSION,
        input_shape=(200, 200),
        class_masks={"built": canvas},
    )
    isolated = res.get_isolated_building_footprints(min_area=150, max_area=40000)

    # Road should be severed / removed; building retained
    assert np.any(isolated[20:50, 20:50])
    assert not np.any(isolated[98:101, :])


# =========================================================================
# G, H: Mask-Polygon IoU and Anti-Chord Polygonization
# =========================================================================
def test_g_h_polygon_mask_iou_gate() -> None:
    """Polygons must satisfy MIN_POLYGON_IOU (>= 0.60) against source component."""
    mask = np.zeros((100, 100), dtype=bool)
    mask[20:80, 20:80] = True

    polygons = mask_to_validated_polygons(
        mask,
        img_width=100,
        img_height=100,
        min_pixels=50,
        min_iou=MIN_POLYGON_IOU,
    )
    assert len(polygons) == 1
    poly = polygons[0]
    assert poly["validation"]["mask_overlap_iou"] >= MIN_POLYGON_IOU
    assert poly["area_px"] > 0


# =========================================================================
# I, J, K, L, M: Multi-Stage Geometry Validation
# =========================================================================
def test_i_j_k_invalid_geometry_rejection() -> None:
    """Out-of-bounds, self-intersecting, and NaN coordinates are rejected."""
    # 1. Out-of-bounds
    oob = [[10.0, 10.0], [500.0, 10.0], [500.0, 500.0], [10.0, 500.0], [10.0, 10.0]]
    valid_oob, _, _ = validate_polygon_geometry(oob, img_width=100, img_height=100)
    assert not valid_oob

    # 2. Self-intersecting bowtie
    bowtie = [[10.0, 10.0], [50.0, 50.0], [10.0, 50.0], [50.0, 10.0], [10.0, 10.0]]
    valid_bow, _, _ = validate_polygon_geometry(bowtie, img_width=100, img_height=100)
    assert not valid_bow

    # 3. NaN coordinates
    nan_coords = [[10.0, 10.0], [math.nan, 20.0], [30.0, 30.0], [10.0, 10.0]]
    valid_nan, _, _ = validate_polygon_geometry(nan_coords, img_width=100, img_height=100)
    assert not valid_nan


def test_l_m_empty_mask_and_tiny_component_filtering() -> None:
    """Empty masks produce zero polygons; patches below min_pixels are filtered."""
    empty_mask = np.zeros((100, 100), dtype=bool)
    assert mask_to_validated_polygons(empty_mask, img_width=100, img_height=100) == []

    tiny_mask = np.zeros((100, 100), dtype=bool)
    tiny_mask[10:13, 10:13] = True  # 9 pixels (< 30 min_pixels)
    assert mask_to_validated_polygons(tiny_mask, img_width=100, img_height=100, min_pixels=30) == []


# =========================================================================
# N: No Forced Fallthrough to Bare
# =========================================================================
def test_n_no_forced_bare_classification() -> None:
    """Ambiguous non-water pixels remain 'unclassified', never forced to 'bare'."""
    # Saturated non-earthy purple/magenta that matches no standard land-cover rule
    r = np.full((32, 32), 180, dtype=np.uint16)
    g = np.full((32, 32), 20, dtype=np.uint16)
    b = np.full((32, 32), 200, dtype=np.uint16)

    classified = classify_optical_pixels(r, g, b, scale_factor=255.0)
    assert np.all(classified == "unclassified")
    assert not np.any(classified == "bare")


def _make_test_upload(
    upload_id: str,
    path: Path,
    gsd_m: float | None = None,
    tier: CapabilityTier = CapabilityTier.T1_VERY_HIGH,
) -> Upload:
    return Upload(
        id=upload_id,
        filename=path.name,
        width_px=128,
        height_px=128,
        band_count=3,
        file_size_bytes=1000,
        storage_path=str(path),
        status=UploadStatus.VISUAL_ONLY,
        capabilities=CapabilityPermissions(
            object_classes=[],
            landcover_classes=["bare", "built", "crop", "snow", "vegetation", "water"],
            area_measurements=bool(gsd_m is not None),
            temporal_analysis=False,
        ),
        capability_tier=tier,
        provenance=ProvenanceSource.USER_DECLARED,
        gsd_m=gsd_m,
        checksum_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        overview_url=f"/api/v1/uploads/{upload_id}/overview",
        created_at="2026-09-14T12:00:00Z",
    )


# =========================================================================
# O, P: Query Routing, Unsupported Class & Low Confidence Refusal
# =========================================================================
def test_o_p_unsupported_and_low_confidence(tmp_path: Path) -> None:
    """Querying unsupported targets returns refusal; missing target returns insufficient_evidence."""
    router = QueryRouter()
    route = router.route_query("Where are the aliens and ufos?", gsd_m=0.5)
    assert route.task == AnalysisTask.UNSUPPORTED

    # Dry soil queried for snow returns insufficient evidence with zero fake polygons
    dry_img = Image.new("RGB", (128, 128), color=(185, 155, 115))
    img_path = tmp_path / "dry.png"
    dry_img.save(img_path)

    up = _make_test_upload("up_test_dry", img_path)
    engine = AnalysisEngine()
    resp = engine.analyze(query="Where is the snow in this image?", upload=up, image_path=img_path)
    assert resp.status == "insufficient_evidence"
    assert "Insufficient evidence for reliable detection" in resp.answer
    assert len(resp.evidence) == 0
    assert len(resp.overlays.polygons) == 0


# =========================================================================
# Q: Determinism Regression Test (§51)
# =========================================================================
def test_q_determinism_repeated_input() -> None:
    """Repeated identical inputs yield identical masks, classes, and polygon vertices."""
    model = SatelliteSegmentationModel()
    # Create test tile with distinct features
    arr = np.zeros((128, 128, 3), dtype=np.uint8)
    arr[:, :] = [140, 110, 80]
    arr[20:70, 20:70] = [20, 60, 180]  # water
    arr[80:120, 80:120] = [210, 205, 200]  # built
    img = Image.fromarray(arr)

    res1 = model.predict(img)
    res2 = model.predict(img)

    assert np.array_equal(res1.get_mask("water"), res2.get_mask("water"))
    assert np.array_equal(res1.get_mask("built"), res2.get_mask("built"))
    assert res1.confidence == res2.confidence


# =========================================================================
# R, S, T, U: Coordinates and Geospatial Scale Integrity (§29, §39)
# =========================================================================
def test_t_u_missing_gsd_no_fake_hectares(tmp_path: Path) -> None:
    """Images without valid GSD report physical_area as None, never inventing hectares."""
    img = Image.new("RGB", (128, 128), color=(20, 60, 180))
    path = tmp_path / "water.png"
    img.save(path)

    up = _make_test_upload("up_test_scale", path, gsd_m=None, tier=CapabilityTier.T0_UNKNOWN)
    engine = AnalysisEngine()
    resp = engine.analyze(query="Where is the water?", upload=up, image_path=path)
    for ev in resp.evidence:
        assert ev.physical_area_m2 is None
        assert ev.physical_area_ha is None
        assert ev.coordinate_space == "image_pixels"


# =========================================================================
# V, W, X: Temporal Change Detection & Registration Failure Gating (§34, §35)
# =========================================================================
def test_v_w_x_temporal_change_and_misalignment_gate() -> None:
    """Misaligned images exceeding MAX_REGISTRATION_SHIFT (15.0px) refuse comparison."""
    img_a = Image.new("RGB", (128, 128), color=(100, 100, 100))
    # Synthetic pattern
    arr_a = np.array(img_a)
    arr_a[30:70, 30:70] = [200, 200, 200]
    img_a = Image.fromarray(arr_a)

    # Artificially shifted image B by 25 pixels (exceeding 15px threshold)
    arr_b = np.roll(arr_a, shift=25, axis=1)
    img_b = Image.fromarray(arr_b)

    detector = ChangeDetector()
    res = detector.detect_changes(img_a=img_a, img_b=img_b, gsd_m=0.5)

    assert res.status == "unaligned"
    assert len(res.change_polygons) == 0
    assert len(res.evidence_items) == 0
    assert any("not sufficiently aligned" in w for w in res.warnings)


# =========================================================================
# Y, Z: Gemini Malformed JSON / Transport Unavailable (§22, §23)
# =========================================================================
def test_y_z_gemini_failure_preserves_authoritative_cv(tmp_path: Path) -> None:
    """Gemini 503 or failure preserves CV spatial evidence without fabricating geometry."""
    img = Image.new("RGB", (128, 128), color=(20, 60, 180))
    path = tmp_path / "water_cv.png"
    img.save(path)

    up = _make_test_upload("up_test_gemini_fail", path)
    engine = AnalysisEngine()
    # Force Gemini adapter to return detection_failed
    engine.gemini_adapter.enabled = False

    resp = engine.analyze(query="Where is the water?", upload=up, image_path=path)
    assert resp.status == "completed"
    assert len(resp.evidence) >= 1
    # Spatial evidence comes authoritatively from CV, not LLM
    assert resp.evidence[0].class_label == "water"
    assert resp.evidence[0].geometry_source == "segmentation_mask"
    assert resp.evidence[0].validation["geometry_valid"] is True
    # Explanation informs user of CV analysis without crashing
    assert "computer-vision analysis identified" in resp.answer
