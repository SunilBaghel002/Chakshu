"""Upload and detection API endpoints for SIH26167 single-image workflow (Tasks 5.1-5.2)."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.exceptions import NotFoundError
from app.schemas.detection import DetectionSet, Upload
from app.services.detection import DetectionService
from app.services.upload_service import UploadService
from app.settings import settings

router = APIRouter(prefix="/uploads", tags=["Uploads"])

upload_service = UploadService()
detection_service = DetectionService()

# In-memory registry for uploaded objects and detection sets
_uploads_registry: dict[str, Upload] = {}
_detections_registry: dict[str, DetectionSet] = {}


@router.post("", response_model=Upload, status_code=202)
async def upload_image(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    gsd_m: float | None = Form(default=None),
    acquired_at: str | None = Form(default=None),
    notes: str | None = Form(default=None),
) -> Upload:
    """Upload an aerial/satellite image, perform security validation, and assign capability tier."""
    filename = file.filename or "upload.bin"
    file_bytes = await file.read()

    upload_record = upload_service.process_upload(
        file_bytes=file_bytes,
        original_filename=filename,
        title=title,
        user_gsd_m=gsd_m,
        user_acquired_at=acquired_at,
    )

    # Store in memory registry
    _uploads_registry[upload_record.id] = upload_record

    # Run detection pipeline
    stored_path = settings.UPLOADS_DIR / upload_record.id / upload_record.filename
    detection_set = detection_service.run_detection_pipeline(
        upload=upload_record,
        image_path=stored_path,
    )
    _detections_registry[upload_record.id] = detection_set

    return upload_record


@router.get("/{upload_id}", response_model=Upload)
async def get_upload(upload_id: str) -> Upload:
    """Retrieve metadata, GSD tier, and permissions for an uploaded image."""
    if upload_id not in _uploads_registry:
        raise NotFoundError(f"Upload with ID {upload_id} not found.")
    return _uploads_registry[upload_id]


@router.get("/{upload_id}/detections", response_model=DetectionSet)
async def get_upload_detections(
    upload_id: str,
    refresh: bool = False,
) -> DetectionSet:
    """Retrieve complete DetectionSet for an upload, including coverage and rejections."""
    if upload_id not in _detections_registry or refresh:
        if upload_id in _uploads_registry:
            upload_record = _uploads_registry[upload_id]
            stored_path = settings.UPLOADS_DIR / upload_record.id / upload_record.filename
            detection_set = detection_service.run_detection_pipeline(
                upload=upload_record,
                image_path=stored_path,
            )
            _detections_registry[upload_id] = detection_set
            return detection_set
        raise NotFoundError(f"Detection set for upload {upload_id} not found.")
    return _detections_registry[upload_id]


@router.get("/{upload_id}/overview")
async def get_upload_overview(upload_id: str) -> FileResponse:
    """Serve max-2048-px overview JPEG with strict inline content-disposition (PRD 5 §12)."""
    overview_path = settings.UPLOADS_DIR / upload_id / "overview.jpg"
    if not overview_path.exists():
        raise NotFoundError(f"Overview image for upload {upload_id} not found.")

    return FileResponse(
        path=overview_path,
        media_type="image/jpeg",
        headers={"Content-Disposition": "inline"},
    )
