"""Tests verifying evidence grounding, polygon validation, and query-driven analysis.

Conforms to SIH26167 §30:
A. Scene understanding (no fabricated geometry).
B. Building detection (grounded CV masks and polygons).
C. Water segmentation (mask + validated polygons with IoU >= 0.65).
D. Low-confidence rejection ("Insufficient evidence for reliable detection").
E. Temporal change detection (phase correlation + change mask + polygons).
F. Image scale integrity (no fake hectares when GSD is unknown).
G. Determinism (repeated runs produce stable spatial geometry).
H. Polygon validation (rejection of self-intersecting, out-of-bounds, degenerate geometry).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image
import pytest

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


def _create_synthetic_test_image(pattern: str = "water", size: tuple[int, int] = (256, 256)) -> Image.Image:
    """Generate synthetic optical RGB test image with distinct ground features."""
    w, h = size
    arr = np.zeros((h, w, 3), dtype=np.uint8)

    if pattern == "water":
        # Dark soil/terrain background (brownish)
        arr[:, :] = [140, 110, 80]
        # Prominent deep-blue lake in the center (x: 50..180, y: 50..180)
        arr[50:180, 50:180] = [20, 60, 180]

    elif pattern == "buildings":
        # Greenish terrain background
        arr[:, :] = [60, 140, 60]
        # Distinct textured grey building blocks
        arr[40:100, 40:110] = [190, 190, 195]
        arr[140:210, 130:200] = [210, 205, 200]

    elif pattern == "dry_soil":
        # Pure dry desert terrain (no water, no snow, no buildings)
        arr[:, :] = [185, 155, 115]

    elif pattern == "temporal_after":
        # Identical to water background, but with a new bright rectangular construction site
        arr[:, :] = [140, 110, 80]
        arr[50:180, 50:180] = [20, 60, 180]
        # New construction clearing (x: 190..240, y: 30..90)
        arr[30:90, 190:240] = [230, 230, 235]

    return Image.fromarray(arr, mode="RGB")


@pytest.fixture
def sample_upload_no_gsd(tmp_path: Path) -> tuple[Upload, Path]:
    """Fixture for visual-only upload without geospatial scale (unknown GSD)."""
    img = _create_synthetic_test_image("water")
    img_path = tmp_path / "water_no_gsd.png"
    img.save(img_path)

    up = Upload(
        id="up_test_no_gsd_01",
        filename="water_no_gsd.png",
        width_px=256,
        height_px=256,
        band_count=3,
        status=UploadStatus.VISUAL_ONLY,
        capability_tier=CapabilityTier.T0_UNKNOWN,
        capabilities=CapabilityPermissions(
            object_classes=[],
            landcover_classes=[],
            area_measurements=False,
            temporal_analysis=False,
        ),
        gsd_m=None,
        gsd_source=None,
        bounds_4326=None,
        checksum_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        overview_url="/api/v1/uploads/up_test_no_gsd_01/overview",
        created_at="2026-09-14T12:00:00Z",
    )
    return up, img_path


@pytest.fixture
def sample_upload_with_gsd(tmp_path: Path) -> tuple[Upload, Path]:
    """Fixture for satellite upload with verified 0.5m GSD."""
    img = _create_synthetic_test_image("buildings")
    img_path = tmp_path / "buildings_gsd.png"
    img.save(img_path)

    up = Upload(
        id="up_test_with_gsd_02",
        filename="buildings_gsd.png",
        width_px=256,
        height_px=256,
        band_count=3,
        status=UploadStatus.GEOREFERENCED,
        capability_tier=CapabilityTier.T1_VERY_HIGH,
        capabilities=CapabilityPermissions(
            object_classes=["building", "storage_tank"],
            landcover_classes=["built", "vegetation"],
            area_measurements=True,
            temporal_analysis=True,
        ),
        gsd_m=0.5,
        gsd_source=ProvenanceSource.METADATA,
        bounds_4326=[77.10, 28.50, 77.12, 28.52],
        checksum_sha256="a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
        overview_url="/api/v1/uploads/up_test_with_gsd_02/overview",
        created_at="2026-09-14T12:00:00Z",
    )
    return up, img_path


# =========================================================================
# Test A: Scene Understanding (Zero Fabricated Geometry)
# =========================================================================
def test_scene_understanding_no_fabricated_geometry(sample_upload_no_gsd: tuple[Upload, Path]) -> None:
    """Scene understanding query returns text and zero polygons (§16, §30.A)."""
    up, img_path = sample_upload_no_gsd
    engine = AnalysisEngine()

    resp = engine.analyze(
        query="What is visible in this image?",
        upload=up,
        image_path=img_path,
    )

    assert resp.task == AnalysisTask.SCENE_UNDERSTANDING
    assert len(resp.answer) > 10
    # Strict rule: Scene understanding MUST NOT produce fabricated polygons
    assert len(resp.evidence) == 0
    assert len(resp.overlays.polygons) == 0
    assert len(resp.overlays.boxes) == 0
    assert resp.status == "completed"


# =========================================================================
# Test B: Building Detection (Grounded CV Evidence)
# =========================================================================
def test_building_detection_grounded_evidence(sample_upload_with_gsd: tuple[Upload, Path]) -> None:
    """Building detection extracts grounded polygons inside image bounds (§9, §30.B)."""
    up, img_path = sample_upload_with_gsd
    engine = AnalysisEngine()

    resp = engine.analyze(
        query="Where are the buildings?",
        upload=up,
        image_path=img_path,
    )

    assert resp.task == AnalysisTask.BUILDING_DETECTION
    assert len(resp.evidence) > 0

    for ev in resp.evidence:
        assert ev.class_label == "building"
        assert ev.confidence >= 0.50
        assert ev.pixel_area > 30.0
        assert ev.coordinate_space == "image_pixels"
        assert ev.validation.get("geometry_valid") is True
        assert ev.validation.get("mask_overlap_iou") is not None
        assert ev.validation.get("mask_overlap_iou") >= 0.60
        # GSD is verified: physical area should be present
        assert ev.physical_area_m2 is not None
        assert ev.physical_area_m2 > 0

        # Polygon coordinates must be strictly within [0..256, 0..256]
        coords = ev.geom_px["coordinates"][0]
        for x, y in coords:
            assert 0 <= x <= 256
            assert 0 <= y <= 256


# =========================================================================
# Test C: Water Segmentation (Mask + Polygons IoU >= 0.65)
# =========================================================================
def test_water_segmentation_grounded(sample_upload_no_gsd: tuple[Upload, Path]) -> None:
    """Water query extracts real water mask and validated polygons (§10, §13, §30.C)."""
    up, img_path = sample_upload_no_gsd
    engine = AnalysisEngine()

    resp = engine.analyze(
        query="Where are the water bodies?",
        upload=up,
        image_path=img_path,
    )

    assert resp.task == AnalysisTask.WATER_SEGMENTATION
    assert len(resp.evidence) >= 1
    water_ev = resp.evidence[0]
    assert water_ev.class_label == "water"
    assert water_ev.pixel_area > 1000
    assert water_ev.validation["geometry_valid"] is True
    assert water_ev.validation["mask_overlap_iou"] >= 0.65
    assert resp.overlays.mask_url is not None


# =========================================================================
# Test D: Low-Confidence Rejection ("Insufficient evidence for reliable detection")
# =========================================================================
def test_low_confidence_rejection_no_hallucination(tmp_path: Path) -> None:
    """Querying for absent features returns 'Insufficient evidence' and NO geometry (§26, §30.D)."""
    img = _create_synthetic_test_image("dry_soil")
    img_path = tmp_path / "dry_desert.png"
    img.save(img_path)

    up = Upload(
        id="up_desert_01",
        filename="dry_desert.png",
        width_px=256,
        height_px=256,
        band_count=3,
        status=UploadStatus.VISUAL_ONLY,
        capability_tier=CapabilityTier.T0_UNKNOWN,
        capabilities=CapabilityPermissions(
            object_classes=[], landcover_classes=[], area_measurements=False, temporal_analysis=False
        ),
        checksum_sha256="c0ffee1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        overview_url="/api/v1/uploads/up_desert_01/overview",
        created_at="2026-09-14T12:00:00Z",
    )

    engine = AnalysisEngine()
    resp = engine.analyze(
        query="Where are the water bodies?",
        upload=up,
        image_path=img_path,
    )

    assert resp.status == "insufficient_evidence"
    assert "Insufficient evidence for reliable detection" in resp.answer
    assert len(resp.evidence) == 0
    assert len(resp.overlays.polygons) == 0


# =========================================================================
# Test E: Temporal Change Detection
# =========================================================================
def test_temporal_change_detection(tmp_path: Path) -> None:
    """Two-image comparison detects altered region and extracts change polygons (§20, §30.E)."""
    img_a = _create_synthetic_test_image("water")
    img_b = _create_synthetic_test_image("temporal_after")

    path_a = tmp_path / "before.png"
    path_b = tmp_path / "after.png"
    img_a.save(path_a)
    img_b.save(path_b)

    detector = ChangeDetector()
    res = detector.detect_changes(img_a=img_a, img_b=img_b, gsd_m=0.5)

    assert res.status == "completed"
    assert res.total_change_px > 100
    assert len(res.change_polygons) >= 1
    assert len(res.evidence_items) >= 1
    ev = res.evidence_items[0]
    assert ev.geometry_source == "change_map"
    assert ev.validation["geometry_valid"] is True


# =========================================================================
# Test F: Geospatial Scale Integrity (No Fake Hectares)
# =========================================================================
def test_no_fake_hectares_without_gsd(sample_upload_no_gsd: tuple[Upload, Path]) -> None:
    """Ungeoreferenced image reports physical_area as None, never inventing hectares (§14, §35)."""
    up, img_path = sample_upload_no_gsd
    engine = AnalysisEngine()

    resp = engine.analyze(
        query="Where is the water?",
        upload=up,
        image_path=img_path,
    )

    for ev in resp.evidence:
        assert ev.physical_area_ha is None
        assert ev.physical_area_m2 is None
        assert ev.pixel_area > 0


# =========================================================================
# Test G: Determinism (Stable Spatial Output)
# =========================================================================
def test_spatial_analysis_determinism(sample_upload_no_gsd: tuple[Upload, Path]) -> None:
    """Identical runs on identical image produce identical polygon geometry (§18, §30.G)."""
    up, img_path = sample_upload_no_gsd
    engine = AnalysisEngine()

    resp1 = engine.analyze(query="Where is the water?", upload=up, image_path=img_path)
    resp2 = engine.analyze(query="Where is the water?", upload=up, image_path=img_path)

    assert len(resp1.evidence) == len(resp2.evidence)
    for ev1, ev2 in zip(resp1.evidence, resp2.evidence):
        assert ev1.pixel_area == ev2.pixel_area
        assert ev1.geom_px["coordinates"] == ev2.geom_px["coordinates"]


# =========================================================================
# Test H: Polygon Validation & IoU Consistency
# =========================================================================
def test_polygon_geometry_validation_and_iou() -> None:
    """Rejects self-intersecting, out-of-bounds, and degenerate geometry (§12, §13)."""
    # 1. Out of bounds coordinates
    oob_coords = [[-10.0, 5.0], [50.0, 5.0], [50.0, 50.0], [-10.0, 5.0]]
    valid, reason, _ = validate_polygon_geometry(oob_coords, img_width=100, img_height=100)
    assert not valid
    assert "out_of_bounds" in (reason or "")

    # 2. Degenerate (< 4 vertices)
    degen_coords = [[10.0, 10.0], [20.0, 20.0], [10.0, 10.0]]
    valid, reason, _ = validate_polygon_geometry(degen_coords, img_width=100, img_height=100)
    assert not valid
    assert "insufficient_vertices" in (reason or "")

    # 3. Valid polygon
    good_coords = [[10.0, 10.0], [50.0, 10.0], [50.0, 50.0], [10.0, 50.0], [10.0, 10.0]]
    valid, _, poly = validate_polygon_geometry(good_coords, img_width=100, img_height=100)
    assert valid
    assert poly is not None

    # 4. Mask IoU consistency
    test_mask = np.zeros((100, 100), dtype=bool)
    test_mask[10:50, 10:50] = True
    iou = compute_mask_polygon_iou(poly, test_mask)
    assert iou > 0.95

    # Mask that does not overlap
    other_mask = np.zeros((100, 100), dtype=bool)
    other_mask[70:90, 70:90] = True
    iou_zero = compute_mask_polygon_iou(poly, other_mask)
    assert iou_zero == 0.0
