"""Unit tests for multi-track detection orchestration, Resolution Gate, and NMS (Task 5.5, Phase 5 Gate)."""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import pytest
from PIL import Image

from app.schemas.common import (
    CapabilityTier,
    DetectionKind,
    DetectionTrack,
    ProvenanceSource,
    UploadStatus,
)
from app.schemas.detection import CapabilityPermissions, DetectionSet, Upload
from app.services.detection import DetectionService


@pytest.fixture
def sample_upload_highres(tmp_path: Path) -> tuple[Upload, Path]:
    """Create high-resolution (0.5 m, T1_VERY_HIGH) upload fixture with test image."""
    img_path = tmp_path / "highres_airport.png"
    img = Image.new("RGB", (800, 600), color=(180, 180, 180))
    img.save(img_path)

    upload = Upload(
        id="test_upload_highres",
        filename="highres_airport.png",
        status=UploadStatus.GEOREFERENCED,
        width_px=800,
        height_px=600,
        band_count=3,
        bands=["red", "green", "blue"],
        bounds_4326=[77.10, 28.55, 77.12, 28.57],
        gsd_m=0.50,
        gsd_source=ProvenanceSource.METADATA,
        capability_tier=CapabilityTier.T1_VERY_HIGH,
        capabilities=CapabilityPermissions(
            object_classes=["aircraft", "building", "vehicle", "road"],
            landcover_classes=["built", "water", "vegetation"],
            area_measurements=True,
            temporal_analysis=True,
        ),
        checksum_sha256="0" * 64,
        overview_url="/api/v1/uploads/test_upload_highres/overview",
        created_at="2026-09-12T12:00:00Z",
    )
    return upload, img_path


@pytest.fixture
def sample_upload_sentinel2(tmp_path: Path) -> tuple[Upload, Path]:
    """Create medium-resolution (10 m, T3_MEDIUM) Sentinel-2 upload fixture."""
    img_path = tmp_path / "sentinel2_scene.png"
    img = Image.new("RGB", (512, 512), color=(50, 150, 80))
    img.save(img_path)

    upload = Upload(
        id="test_upload_sentinel2",
        filename="sentinel2_scene.png",
        status=UploadStatus.GEOREFERENCED,
        width_px=512,
        height_px=512,
        band_count=3,
        bands=["red", "green", "blue"],
        bounds_4326=[77.72, 28.10, 77.80, 28.16],
        gsd_m=10.0,
        gsd_source=ProvenanceSource.METADATA,
        capability_tier=CapabilityTier.T3_MEDIUM,
        capabilities=CapabilityPermissions(
            object_classes=["building_cluster", "ship_large", "storage_tank", "road"],
            landcover_classes=["built", "water", "vegetation", "bare", "crop"],
            area_measurements=True,
            temporal_analysis=True,
        ),
        capability_notice="This image is 10 m per pixel — that's Sentinel-2.",
        checksum_sha256="1" * 64,
        overview_url="/api/v1/uploads/test_upload_sentinel2/overview",
        created_at="2026-09-12T12:00:00Z",
    )
    return upload, img_path


def test_resolution_gate_forbids_vehicles_on_10m(
    sample_upload_sentinel2: tuple[Upload, Path],
) -> None:
    """A 10m Sentinel-2 image rejects vehicle and aircraft proposals via Resolution Gate."""
    upload, img_path = sample_upload_sentinel2
    service = DetectionService()

    # Synthetic proposals containing both permitted (building_cluster) and forbidden (vehicle, aircraft)
    proposals: list[dict[str, Any]] = [
        {
            "label": "airplane",  # alias for aircraft -> forbidden at T3
            "bbox": [100, 100, 200, 200],
            "score": 0.95,
            "reason": "Clear jet on runway",
        },
        {
            "label": "car",  # alias for vehicle -> forbidden at T3
            "bbox": [250, 250, 300, 300],
            "score": 0.88,
            "reason": "Vehicle on road",
        },
        {
            "label": "buildings",  # alias for building_cluster -> permitted at T3
            "bbox": [400, 400, 500, 500],
            "score": 0.90,
            "reason": "Dense settlement cluster",
        },
    ]

    result = service.run_detection_pipeline(upload, img_path, synthetic_proposals=proposals)

    # Detections should have NO aircraft or vehicle
    object_labels = [d.label for d in result.detections if d.kind == DetectionKind.BOX]
    assert "aircraft" not in object_labels
    assert "vehicle" not in object_labels
    assert "building_cluster" in object_labels

    # Rejection audit must show reasons
    rejected_reasons = result.rejections.by_reason
    assert "label_forbidden_at_resolution_tier" in rejected_reasons
    assert rejected_reasons["label_forbidden_at_resolution_tier"] >= 2


def test_highres_object_detection_and_nms(
    sample_upload_highres: tuple[Upload, Path],
) -> None:
    """High-res image accepts aircraft, validates box, and deduplicates overlapping boxes with NMS."""
    upload, img_path = sample_upload_highres
    service = DetectionService()

    # Two overlapping aircraft boxes (IoU > 0.5) and one building
    proposals: list[dict[str, Any]] = [
        {
            "label": "airliner",  # alias for aircraft
            "bbox": [100, 100, 300, 300],
            "score": 0.94,
            "reason": "Primary airliner proposal",
        },
        {
            "label": "airplane",  # alias for aircraft, nearly identical box
            "bbox": [105, 105, 305, 305],
            "score": 0.82,
            "reason": "Secondary airliner duplicate",
        },
        {
            "label": "house",  # alias for building
            "bbox": [400, 400, 600, 600],
            "score": 0.89,
            "reason": "Terminal hangar building",
        },
    ]

    result = service.run_detection_pipeline(upload, img_path, synthetic_proposals=proposals)

    # NMS should collapse the 2 aircraft to 1 (the 0.94 score one)
    aircraft_dets = [d for d in result.detections if d.label == "aircraft"]
    assert len(aircraft_dets) == 1
    assert aircraft_dets[0].score == 0.94
    assert aircraft_dets[0].track == DetectionTrack.OBJECT_MODEL
    assert aircraft_dets[0].area_m2 is not None  # Computed because GSD is 0.5m trusted

    # Rejection should account for the suppressed duplicate
    assert "nms_duplicate" in result.rejections.by_reason


def test_counts_summary_matches_detection_list(
    sample_upload_highres: tuple[Upload, Path],
) -> None:
    """CountsSummary matches exact count of detections in the response envelope."""
    upload, img_path = sample_upload_highres
    service = DetectionService()

    proposals: list[dict[str, Any]] = [
        {"label": "aircraft", "bbox": [50, 50, 150, 150], "score": 0.90},
        {"label": "building", "bbox": [200, 200, 350, 350], "score": 0.85},
    ]

    result = service.run_detection_pipeline(upload, img_path, synthetic_proposals=proposals)

    total_boxes = sum(1 for d in result.detections if d.kind == DetectionKind.BOX)
    total_polys = sum(1 for d in result.detections if d.kind == DetectionKind.POLYGON)

    assert result.counts.total_object_detections == total_boxes
    assert result.counts.total_landcover_detections == total_polys
    assert len(result.detections) == total_boxes + total_polys
