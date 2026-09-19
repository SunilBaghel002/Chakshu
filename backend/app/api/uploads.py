"""Upload and detection API endpoints for Chakshu single-image workflow (Tasks T-1 - T-3).

Guarantees 100% dynamic per-upload detection with zero static fallback data.
"""

from __future__ import annotations

import json
import logging
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool
from PIL import Image

from pydantic import BaseModel

from app.exceptions import NotFoundError
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.schemas.detection import DetectionSet, Upload
from app.services.analysis_engine import AnalysisEngine
from app.services.annotate import annotate_image
from app.services.detection import DetectionService
from app.services.upload_service import UploadService
from app.settings import settings

log = logging.getLogger(__name__)

router = APIRouter(prefix="/uploads", tags=["Uploads"])

upload_service = UploadService()
detection_service = DetectionService()
analysis_engine = AnalysisEngine()

# In-memory registry for uploaded objects and detection sets
_uploads_registry: dict[str, Upload] = {}
_detections_registry: dict[str, DetectionSet] = {}


class UploadQueryPayload(BaseModel):
    """Payload for query-driven upload analysis."""

    query: str
    comparison_upload_id: str | None = None


@router.post("", response_model=Upload, status_code=202)
async def upload_image(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    gsd_m: float | None = Form(default=None),
    acquired_at: str | None = Form(default=None),
    notes: str | None = Form(default=None),
) -> Upload:
    """Upload an aerial/satellite image, run dynamic detection, and return results."""
    filename = file.filename or "upload.bin"
    file_bytes = await file.read()

    upload_record = upload_service.process_upload(
        file_bytes=file_bytes,
        original_filename=filename,
        title=title,
        user_gsd_m=gsd_m,
        user_acquired_at=acquired_at,
    )

    stored_path = settings.UPLOADS_DIR / upload_record.id / upload_record.filename
    overview_path = settings.UPLOADS_DIR / upload_record.id / "overview.jpg"

    # 1. Sanitize image (PIL re-encode without EXIF) & make overview
    raw_img = Image.open(stored_path).convert("RGB")
    clean_overview = Image.new("RGB", raw_img.size)
    clean_overview.paste(raw_img)
    clean_overview.thumbnail((2048, 2048), Image.Resampling.BILINEAR)
    clean_overview.save(overview_path, format="JPEG", quality=90)

    # 2. Run detection pipeline on actual pixels (Track 1 landcover + Track 3 CV detection)
    detection_set = await run_in_threadpool(
        detection_service.run_detection_pipeline,
        upload=upload_record,
        image_path=stored_path,
        mode="reconcile",
    )
    detection_set.artifact_version = uuid.uuid4().hex

    # 3. Persist detections.json
    det_path = settings.UPLOADS_DIR / upload_record.id / "detections.json"
    with open(det_path, "w") as f:
        f.write(detection_set.model_dump_json(indent=2))
    _detections_registry[upload_record.id] = detection_set

    # 4. Render and persist annotated image
    try:
        base_overview = Image.open(overview_path)
        ann_img = annotate_image(
            base_overview,
            [d.model_dump() for d in detection_set.detections],
            overlay_lc=True,
            orig_width=upload_record.width_px,
            orig_height=upload_record.height_px,
        )
        ann_path = settings.UPLOADS_DIR / upload_record.id / "annotated.jpg"
        ann_img.save(ann_path, format="JPEG", quality=90)
    except Exception as exc:
        log.warning("Failed to render annotated image: %s", exc)

    # 5. Populate upload record with annotated_url, explanation, detections, coverage
    upload_record.annotated_url = f"/api/v1/uploads/{upload_record.id}/annotated"
    upload_record.explanation = detection_set.explanation
    upload_record.detections = detection_set.detections
    upload_record.coverage = detection_set.coverage
    upload_record.stats = detection_set.stats

    _uploads_registry[upload_record.id] = upload_record
    meta_path = settings.UPLOADS_DIR / upload_record.id / "metadata.json"
    with open(meta_path, "w") as f:
        f.write(upload_record.model_dump_json(indent=2))

    return upload_record


def _find_upload_file(upload_id: str, filenames: list[str]) -> Path | None:
    """Find file in uploads directory across possible CWD locations."""
    search_dirs = [
        settings.UPLOADS_DIR / upload_id,
        Path("data/uploads") / upload_id,
        Path("backend/data/uploads") / upload_id,
    ]
    for d in search_dirs:
        for fn in filenames:
            p = d / fn
            if p.exists():
                return p
    return None


@router.get("/{upload_id}", response_model=Upload)
async def get_upload(upload_id: str) -> Upload:
    """Retrieve metadata, GSD tier, and permissions for an uploaded image."""
    if upload_id in _uploads_registry:
        return _uploads_registry[upload_id]

    meta_file = _find_upload_file(upload_id, ["metadata.json"])
    if meta_file and meta_file.exists():
        with open(meta_file, "r") as f:
            upload_obj = Upload(**json.load(f))
            _uploads_registry[upload_id] = upload_obj
            return upload_obj

    raise NotFoundError(f"Upload with ID {upload_id} not found.")


@router.get("/{upload_id}/detections", response_model=DetectionSet)
async def get_upload_detections(
    upload_id: str,
    mode: str | None = None,
    refresh: bool = False,
) -> DetectionSet:
    """Retrieve complete DetectionSet for an upload, including coverage and rejections."""
    if upload_id not in _uploads_registry:
        try:
            await get_upload(upload_id)
        except NotFoundError:
            pass

    upload_record = _uploads_registry.get(upload_id)
    if not upload_record:
        raise NotFoundError(f"Detection set for upload {upload_id} not found.")

    det_file = _find_upload_file(upload_id, ["detections.json"])
    if not refresh and upload_id in _detections_registry:
        return _detections_registry[upload_id]

    if not refresh and det_file and det_file.exists():
        with open(det_file, "r") as f:
            cached_set = DetectionSet(**json.load(f))
            _detections_registry[upload_id] = cached_set
            return cached_set

    # Run detection on demand if refresh is requested or not yet cached
    effective_mode = mode.lower() if mode else "reconcile"
    stored_path = _find_upload_file(upload_record.id, [upload_record.filename])
    if not stored_path:
        stored_path = settings.UPLOADS_DIR / upload_record.id / upload_record.filename
    detection_set = await run_in_threadpool(
        detection_service.run_detection_pipeline,
        upload=upload_record,
        image_path=stored_path,
        mode=effective_mode,
    )
    detection_set.artifact_version = uuid.uuid4().hex
    _detections_registry[upload_id] = detection_set
    det_out = settings.UPLOADS_DIR / upload_id / "detections.json"
    det_out.parent.mkdir(parents=True, exist_ok=True)
    with open(det_out, "w") as f:
        f.write(detection_set.model_dump_json(indent=2))

    # Re-render annotated image
    overview_path = _find_upload_file(upload_record.id, ["overview.jpg", "overview.png"])
    if overview_path and overview_path.exists():
        try:
            base_overview = Image.open(overview_path)
            ann_img = annotate_image(
                base_overview,
                [d.model_dump() for d in detection_set.detections],
                overlay_lc=True,
                orig_width=upload_record.width_px,
                orig_height=upload_record.height_px,
            )
            ann_path = settings.UPLOADS_DIR / upload_record.id / "annotated.jpg"
            ann_img.save(ann_path, format="JPEG", quality=90)
        except Exception as exc:
            log.warning("Failed to re-render annotated image: %s", exc)

    return detection_set


@router.get("/{upload_id}/overview")
@router.get("/{upload_id}/overview.jpg")
@router.get("/{upload_id}/overview.png")
async def get_upload_overview(upload_id: str) -> FileResponse:
    """Serve max-2048-px overview JPEG with strict inline content-disposition (PRD 5 §12)."""
    overview_path = _find_upload_file(upload_id, ["overview.jpg", "overview.png"])
    if not overview_path:
        raise NotFoundError(f"Overview image for upload {upload_id} not found.")

    return FileResponse(
        path=overview_path,
        media_type="image/jpeg" if str(overview_path).endswith(".jpg") else "image/png",
        headers={"Content-Disposition": "inline"},
    )


@router.get("/{upload_id}/annotated")
@router.get("/{upload_id}/annotated.jpg")
async def get_annotated_image(upload_id: str, overlay: str | None = None) -> FileResponse:
    """Serve annotated JPEG showing detection boxes and water polygons (Task T-3)."""
    annotated_path = _find_upload_file(upload_id, ["annotated.jpg"])
    overview_path = _find_upload_file(upload_id, ["overview.jpg", "overview.png"])
    det_path = _find_upload_file(upload_id, ["detections.json"])

    if overlay == "lc" or not annotated_path or not annotated_path.exists():
        if not overview_path or not overview_path.exists():
            raise NotFoundError(f"Overview image for upload {upload_id} not found.")
        base_img = Image.open(overview_path)
        dets: list[dict[str, Any]] = []
        upload_obj = _uploads_registry.get(upload_id)
        if det_path and det_path.exists():
            with open(det_path, "r") as f:
                det_data = json.load(f)
                dets = det_data.get("detections", [])
        ann_img = annotate_image(
            base_img,
            dets,
            overlay_lc=(overlay == "lc"),
            orig_width=upload_obj.width_px if upload_obj else None,
            orig_height=upload_obj.height_px if upload_obj else None,
        )
        if overlay == "lc":
            lc_path = settings.UPLOADS_DIR / upload_id / "annotated_lc.jpg"
            lc_path.parent.mkdir(parents=True, exist_ok=True)
            ann_img.save(lc_path, format="JPEG", quality=90)
            return FileResponse(
                path=lc_path,
                media_type="image/jpeg",
                headers={
                    "Content-Disposition": "inline",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                },
            )
        dest_ann = settings.UPLOADS_DIR / upload_id / "annotated.jpg"
        dest_ann.parent.mkdir(parents=True, exist_ok=True)
        ann_img.save(dest_ann, format="JPEG", quality=90)
        annotated_path = dest_ann

    return FileResponse(
        path=annotated_path,
        media_type="image/jpeg",
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    )


@router.post("/{upload_id}/analyze", response_model=AnalysisResponse)
async def analyze_upload_query(upload_id: str, payload: UploadQueryPayload) -> AnalysisResponse:
    """Execute query-driven satellite analysis for an upload (§4, §6, §34)."""
    upload_record = await get_upload(upload_id)
    stored_path = _find_upload_file(upload_record.id, [upload_record.filename])
    if not stored_path:
        stored_path = settings.UPLOADS_DIR / upload_record.id / upload_record.filename

    comp_record: Upload | None = None
    comp_path: Path | None = None
    if payload.comparison_upload_id:
        try:
            comp_record = await get_upload(payload.comparison_upload_id)
            comp_path = _find_upload_file(comp_record.id, [comp_record.filename])
            if not comp_path:
                comp_path = settings.UPLOADS_DIR / comp_record.id / comp_record.filename
        except NotFoundError:
            log.warning("Comparison upload %s not found", payload.comparison_upload_id)

    return analysis_engine.analyze(
        query=payload.query,
        upload=upload_record,
        image_path=stored_path,
        comparison_upload=comp_record,
        comparison_image_path=comp_path,
    )


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_direct(payload: AnalysisRequest) -> AnalysisResponse:
    """Execute query-driven satellite analysis directly with upload_id (§34)."""
    upload_record = await get_upload(payload.upload_id)
    stored_path = _find_upload_file(upload_record.id, [upload_record.filename])
    if not stored_path:
        stored_path = settings.UPLOADS_DIR / upload_record.id / upload_record.filename

    comp_record: Upload | None = None
    comp_path: Path | None = None
    if payload.comparison_upload_id:
        try:
            comp_record = await get_upload(payload.comparison_upload_id)
            comp_path = _find_upload_file(comp_record.id, [comp_record.filename])
            if not comp_path:
                comp_path = settings.UPLOADS_DIR / comp_record.id / comp_record.filename
        except NotFoundError:
            log.warning("Comparison upload %s not found", payload.comparison_upload_id)

    return analysis_engine.analyze(
        query=payload.query,
        upload=upload_record,
        image_path=stored_path,
        comparison_upload=comp_record,
        comparison_image_path=comp_path,
    )


@router.get("/{upload_id}/mask.png")
@router.get("/{upload_id}/{mask_name}_mask.png")
async def get_mask_overlay(upload_id: str, mask_name: str = "water_segmentation") -> FileResponse:
    """Serve dynamic PNG mask overlay for UI layer toggle (§23)."""
    candidates = [
        f"{mask_name}_mask.png",
        f"{mask_name}.png",
        "mask.png",
        "water_segmentation_mask.png",
        "building_detection_mask.png",
        "vegetation_segmentation_mask.png",
        "change_mask.png",
    ]
    target = _find_upload_file(upload_id, candidates)
    if not target or not target.exists():
        raise NotFoundError(f"Mask overlay for upload {upload_id} not found.")

    return FileResponse(
        path=target,
        media_type="image/png",
        headers={"Content-Disposition": "inline", "Cache-Control": "no-cache"},
    )
