"""Unit tests for upload ingestion, security validation, and Resolution Gate (Task 5.1, Phase 5 Gate)."""

from __future__ import annotations

import io
from pathlib import Path

import pytest
from PIL import Image

from app.exceptions import FileTooLargeError, UnsupportedFileTypeError
from app.schemas.common import CapabilityTier, ProvenanceSource, UploadStatus
from app.services.upload_service import (
    UploadService,
    sanitize_filename,
    verify_magic_bytes,
)


def _create_png_bytes(width: int = 100, height: int = 100, color: tuple[int, int, int] = (100, 150, 200)) -> bytes:
    """Helper to generate valid PNG bytes in memory."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _create_tiff_bytes(width: int = 64, height: int = 64) -> bytes:
    """Helper to generate valid TIFF bytes in memory."""
    img = Image.new("RGB", (width, height), color=(50, 100, 150))
    buf = io.BytesIO()
    img.save(buf, format="TIFF")
    return buf.getvalue()


def test_filename_sanitization() -> None:
    """Path traversal sequences and unsafe characters are neutralized."""
    assert sanitize_filename("../../etc/passwd.png") == "passwd.png"
    assert sanitize_filename("..\\..\\windows\\system32\\cmd.tif") == "cmd.tif"
    assert sanitize_filename("safe_image-01.jpg") == "safe_image-01.jpg"


def test_magic_byte_verification() -> None:
    """Magic bytes are verified against declared extension."""
    png_bytes = _create_png_bytes()
    tiff_bytes = _create_tiff_bytes()

    assert verify_magic_bytes(png_bytes[:16], ".png") is True
    assert verify_magic_bytes(tiff_bytes[:16], ".tif") is True
    assert verify_magic_bytes(png_bytes[:16], ".tif") is False  # Renamed .png to .tif
    assert verify_magic_bytes(b"PK\x03\x04zipcontent", ".zip") is False


def test_unsupported_filetype_rejected(tmp_path: Path) -> None:
    """Disallowed extension (.zip) raises UnsupportedFileTypeError (415)."""
    service = UploadService(uploads_dir=tmp_path)
    with pytest.raises(UnsupportedFileTypeError) as exc_info:
        service.validate_file_metadata("archive.zip", 1024, b"PK\x03\x04")
    assert "That file type isn't supported" in str(exc_info.value)


def test_magic_byte_mismatch_rejected(tmp_path: Path) -> None:
    """File disguised with wrong extension is rejected with 415."""
    service = UploadService(uploads_dir=tmp_path)
    png_bytes = _create_png_bytes()
    # Claiming to be a GeoTIFF while sending PNG magic bytes
    with pytest.raises(UnsupportedFileTypeError):
        service.validate_file_metadata("fake_geo.tif", len(png_bytes), png_bytes[:16])


def test_file_size_limit_rejected(tmp_path: Path) -> None:
    """File exceeding size threshold raises FileTooLargeError (413) with verbatim message."""
    service = UploadService(uploads_dir=tmp_path)
    # 30 MB PNG exceeds 25 MB limit
    large_bytes_len = 30 * 1024 * 1024
    with pytest.raises(FileTooLargeError) as exc_info:
        service.validate_file_metadata("huge.png", large_bytes_len, b"\x89PNG\r\n\x1a\n")
    assert "The limit is 25 MB" in str(exc_info.value)


def test_upload_png_lands_as_visual_only(tmp_path: Path) -> None:
    """Plain PNG upload lands as VISUAL_ONLY with null coordinates and unknown resolution."""
    service = UploadService(uploads_dir=tmp_path)
    png_bytes = _create_png_bytes(120, 80)

    upload = service.process_upload(
        file_bytes=png_bytes,
        original_filename="drone_snapshot.png",
        title="Drone Snapshot",
    )

    assert upload.status == UploadStatus.VISUAL_ONLY
    assert upload.crs_epsg is None
    assert upload.bounds_4326 is None
    assert upload.gsd_m is None
    assert upload.capability_tier == CapabilityTier.T0_UNKNOWN
    assert upload.capabilities.area_measurements is False
    assert upload.capabilities.object_classes == []
    assert upload.capability_notice is not None
    assert "I don't know this image's resolution" in upload.capability_notice
    assert Path(tmp_path / upload.id / "overview.jpg").exists()


def test_upload_with_user_declared_gsd(tmp_path: Path) -> None:
    """User-declared GSD enables capability permissions up to declared resolution."""
    service = UploadService(uploads_dir=tmp_path)
    png_bytes = _create_png_bytes(200, 200)

    # 0.5m declared resolution yields T1_VERY_HIGH
    upload = service.process_upload(
        file_bytes=png_bytes,
        original_filename="aerial.png",
        user_gsd_m=0.5,
    )

    assert upload.gsd_m == 0.5
    assert upload.gsd_source == ProvenanceSource.USER_DECLARED
    assert upload.capabilities.object_classes == ["aircraft", "building", "container", "road", "ship", "storage_tank", "swimming_pool", "tower", "vehicle"] or "aircraft" in upload.capabilities.object_classes
    assert upload.capabilities.area_measurements is True


def test_upload_api_routes() -> None:
    """Verify FastAPI /api/v1/uploads endpoints (POST upload, GET metadata, GET detections, GET overview)."""
    from fastapi.testclient import TestClient
    from app.main import create_app

    app = create_app()
    client = TestClient(app)

    png_bytes = _create_png_bytes(100, 100)

    # 1. POST /api/v1/uploads
    resp = client.post(
        "/api/v1/uploads",
        files={"file": ("test_flight.png", png_bytes, "image/png")},
        data={"title": "Test Flight", "gsd_m": "0.8"},
    )
    assert resp.status_code == 202
    data = resp.json()
    upload_id = data["id"]
    assert data["filename"] == "test_flight.png"
    assert data["gsd_m"] == 0.8
    assert data["capability_tier"] == "T1_VERY_HIGH"

    # 2. GET /api/v1/uploads/{id}
    get_resp = client.get(f"/api/v1/uploads/{upload_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == upload_id

    # 3. GET /api/v1/uploads/{id}/detections
    det_resp = client.get(f"/api/v1/uploads/{upload_id}/detections")
    assert det_resp.status_code == 200
    det_data = det_resp.json()
    assert "upload" in det_data
    assert "detections" in det_data
    assert "counts" in det_data
    assert "rejections" in det_data

    # 4. GET /api/v1/uploads/{id}/overview
    overview_resp = client.get(f"/api/v1/uploads/{upload_id}/overview")
    assert overview_resp.status_code == 200
    assert overview_resp.headers["content-type"] == "image/jpeg"
    assert overview_resp.headers["content-disposition"] == "inline"
