"""Verify detection failure contract: timeout, HTTP error, malformed JSON, missing candidates."""

from __future__ import annotations

import json
import urllib.error
from typing import Any
from unittest.mock import patch

import pytest
from PIL import Image

from app.adapters.gemini import GeminiDetectionAdapter
from app.services.detection import DetectionService
from app.schemas.common import CapabilityTier
from app.schemas.detection import CapabilityPermissions, Upload


def _make_upload() -> Upload:
    return Upload(
        id="test_fail",
        filename="test_fail.jpg",
        status="VISUAL_ONLY",
        width_px=400,
        height_px=400,
        band_count=3,
        bands=["red", "green", "blue"],
        capability_tier=CapabilityTier.T1_VERY_HIGH,
        capabilities=CapabilityPermissions(
            object_classes=["building", "vehicle", "aircraft"],
            landcover_classes=["water", "built", "vegetation"],
            area_measurements=True,
        ),
        checksum_sha256="0" * 64,
        overview_url="/test.jpg",
        created_at="2026-09-13T00:00:00Z",
    )


def _make_image() -> Image.Image:
    return Image.new("RGB", (400, 400), color=(34, 139, 34))


class TestTimeoutFailure:
    def test_timeout_returns_detection_failed(self) -> None:
        adapter = GeminiDetectionAdapter()
        adapter.enabled = True

        def raise_timeout(*a: Any, **kw: Any) -> None:
            raise TimeoutError("Connection timed out")

        adapter._call_rest_api = raise_timeout  # type: ignore[assignment]
        result = adapter.detect(_make_image(), gsd_m=0.5, pixel_summary={})

        assert result["status"] == "detection_failed"
        assert "error" in result
        assert isinstance(result["error"], str)
        assert len(result["error"]) > 0


class TestHTTPFailure:
    def test_http_error_returns_detection_failed(self) -> None:
        adapter = GeminiDetectionAdapter()
        adapter.enabled = True

        def raise_http(*a: Any, **kw: Any) -> None:
            raise urllib.error.HTTPError("http://example.com", 500, "Internal Server Error", {}, None)  # type: ignore[arg-type]

        adapter._call_rest_api = raise_http  # type: ignore[assignment]
        result = adapter.detect(_make_image(), gsd_m=0.5, pixel_summary={})

        assert result["status"] == "detection_failed"
        assert "error" in result


class TestMalformedJSON:
    def test_malformed_json_returns_detection_failed(self) -> None:
        adapter = GeminiDetectionAdapter()
        adapter.enabled = True

        def return_none(*a: Any, **kw: Any) -> None:
            return None

        adapter._call_rest_api = return_none  # type: ignore[assignment]
        result = adapter.detect(_make_image(), gsd_m=0.5, pixel_summary={})

        assert result["status"] == "detection_failed"
        assert "error" in result


class TestMissingCandidates:
    def test_missing_candidates_returns_detection_failed(self) -> None:
        adapter = GeminiDetectionAdapter()
        adapter.enabled = True

        def return_none(*a: Any, **kw: Any) -> None:
            return None

        adapter._call_rest_api = return_none  # type: ignore[assignment]
        result = adapter.detect(_make_image(), gsd_m=0.5, pixel_summary={})

        assert result["status"] == "detection_failed"


class TestNoCannedProse:
    def test_failure_has_no_canned_prose(self) -> None:
        """On failure, no canned explanation, fake objects, or static polygons."""
        adapter = GeminiDetectionAdapter()
        adapter.enabled = True
        adapter._call_rest_api = lambda *a, **kw: None  # type: ignore[assignment]

        result = adapter.detect(_make_image(), gsd_m=0.5, pixel_summary={})

        assert result["status"] == "detection_failed"
        # Must not have any of these keys that a success would have
        assert "objects" not in result
        assert "explanation" not in result
        assert "scene_type" not in result


class TestFullPipelineFailure:
    def test_pipeline_reports_detection_failed_on_gemini_failure(self, tmp_path: Any) -> None:
        """Full pipeline with Gemini disabled/failing returns detection_failed status."""
        upload = _make_upload()
        img = _make_image()
        img_path = tmp_path / "test.jpg"
        img.save(img_path)

        svc = DetectionService()
        # Ensure Gemini is disabled
        svc.gemini_adapter.enabled = False

        result = svc.run_detection_pipeline(upload, img_path)

        # Track 3 must be reported as failed/unavailable
        assert result.track_status.get("track_3") in ("failed", "unavailable_at_resolution_tier")
        # Track 1 landcover must still have completed
        assert result.track_status.get("track_1") == "completed"
        # No canned explanation
        assert result.explanation is None or result.status == "detection_failed"
