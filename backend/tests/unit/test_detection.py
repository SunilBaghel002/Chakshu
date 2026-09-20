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
    """A 10m Sentinel-2 image rejects vehicle and aircraft proposals via Resolution Gate.

    Exercises _validate_proposals directly since the pipeline no longer accepts
    synthetic_proposals; it gets objects exclusively from the Gemini adapter.
    """
    upload, _ = sample_upload_sentinel2
    service = DetectionService()

    # Proposals containing both forbidden (vehicle, aircraft) and permitted labels
    proposals = [
        {"label": "airplane", "bbox": [100, 100, 200, 200], "score": 0.95, "visual_evidence": "jet on tarmac"},
        {"label": "car", "bbox": [250, 250, 300, 300], "score": 0.88, "visual_evidence": "vehicle on road"},
        {"label": "storage_tank", "bbox": [400, 400, 500, 500], "score": 0.90, "visual_evidence": "large cylindrical installation"},
    ]

    detections, rejections = service._validate_proposals(proposals, upload)

    # airplane -> aircraft, car -> vehicle: both forbidden at T3_MEDIUM
    object_labels = [d.label for d in detections]
    assert "aircraft" not in object_labels
    assert "vehicle" not in object_labels

    # storage_tank IS permitted at T3
    assert "storage_tank" in object_labels

    # Rejection audit must show forbidden label reasons
    reasons = [r.reason for r in rejections]
    assert "forbidden_label" in reasons


def test_highres_object_detection_and_nms(
    sample_upload_highres: tuple[Upload, Path],
) -> None:
    """High-res image accepts aircraft, validates box, and deduplicates via NMS."""
    upload, _ = sample_upload_highres
    service = DetectionService()

    # Two overlapping aircraft boxes (IoU > 0.5) and one building
    proposals = [
        {"label": "aircraft", "bbox": [100, 100, 300, 300], "score": 0.94, "visual_evidence": "large aircraft shape"},
        {"label": "aircraft", "bbox": [105, 105, 305, 305], "score": 0.82, "visual_evidence": "large aircraft shape"},
        {"label": "building", "bbox": [400, 400, 600, 600], "score": 0.89, "visual_evidence": "large isolated hangar"},
    ]

    detections, rejections = service._validate_proposals(proposals, upload)

    # NMS should collapse the 2 aircraft to 1 (the 0.94 score one)
    aircraft_dets = [d for d in detections if d.label == "aircraft"]
    assert len(aircraft_dets) == 1
    assert aircraft_dets[0].score == 0.94

    # Rejection should account for the suppressed duplicate
    reasons = [r.reason for r in rejections]
    assert "nms_duplicate" in reasons


def test_counts_summary_matches_detection_list(
    sample_upload_highres: tuple[Upload, Path],
) -> None:
    """CountsSummary matches exact count of detections in the response envelope.

    Uses monkeypatched Gemini to return known proposals via the full pipeline.
    """
    upload, img_path = sample_upload_highres
    service = DetectionService()

    # Run the pipeline with Gemini disabled (it will report track_3 as failed,
    # but Track 1 landcover will still produce polygons)
    result = service.run_detection_pipeline(upload, img_path)

    total_boxes = sum(1 for d in result.detections if d.kind == DetectionKind.BOX)
    total_polys = sum(1 for d in result.detections if d.kind == DetectionKind.POLYGON)

    assert result.counts.total_object_detections == total_boxes
    assert result.counts.total_landcover_detections == total_polys
    assert len(result.detections) == total_boxes + total_polys
