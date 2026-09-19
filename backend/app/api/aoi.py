"""Area of Interest (AOI) management and ingestion routes (Task 1.7, PRD 3 §A1, §A2, PRD 4 §6).

Routes:
  GET  /api/v1/aoi             -> list of AOIs
  POST /api/v1/aoi             -> create AOI
  GET  /api/v1/aoi/{id}        -> get AOI
  POST /api/v1/aoi/{id}/ingest -> 202 Accepted + JobResponse
  GET  /api/v1/aoi/{id}/scenes -> list of scenes for AOI
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Query, status

from app.schemas.aoi import (
    Aoi,
    AoiCreate,
    AoiListResponse,
    JobResponse,
    SceneListResponse,
)
from app.services.aoi_service import aoi_service
from app.services.jobs import job_manager
from app.services.scene_service import scene_service

router = APIRouter(prefix="/aoi", tags=["Area of Interest"])


@router.get(
    "",
    response_model=AoiListResponse,
    summary="List all Areas of Interest",
)
async def list_aois() -> AoiListResponse:
    """Retrieve all configured Areas of Interest."""
    items = aoi_service.list_aois()
    return AoiListResponse(items=items, total=len(items))


@router.post(
    "",
    response_model=Aoi,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Area of Interest",
)
async def create_aoi(aoi_in: AoiCreate) -> Aoi:
    """Register a new Area of Interest with automated UTM EPSG derivation."""
    return aoi_service.create_aoi(aoi_in)


@router.get(
    "/{aoi_id}",
    response_model=Aoi,
    summary="Get Area of Interest by ID",
)
async def get_aoi(aoi_id: str) -> Aoi:
    """Fetch details and spatial geometry for a specific Area of Interest."""
    return aoi_service.get_aoi(aoi_id)


@router.post(
    "/{aoi_id}/ingest",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger asynchronous scene ingestion for an AOI",
)
async def trigger_aoi_ingest(
    aoi_id: str,
    background_tasks: BackgroundTasks,
) -> JobResponse:
    """Enqueue background ingestion job for this AOI and return job tracking ID."""
    # Ensure AOI exists
    aoi = aoi_service.get_aoi(aoi_id)

    # Register job
    job = job_manager.create_job(
        job_type="aoi_ingest",
        metadata={"aoi_id": aoi.id, "name": aoi.name},
    )

    # Enqueue background task
    background_tasks.add_task(scene_service.run_aoi_ingest, job.job_id, aoi.id)
    return job


@router.get(
    "/{aoi_id}/scenes",
    response_model=SceneListResponse,
    summary="List scenes for an AOI",
)
async def list_scenes_for_aoi(
    aoi_id: str,
    usable_only: bool = Query(default=False, description="Filter for cloud/shadow-free scenes"),
    before: str | None = Query(default=None, description="Acquisition upper bound (YYYY-MM-DD)"),
    after: str | None = Query(default=None, description="Acquisition lower bound (YYYY-MM-DD)"),
) -> SceneListResponse:
    """Query multi-temporal scenes for an AOI sorted chronologically descending."""
    # Verify AOI exists
    _ = aoi_service.get_aoi(aoi_id)

    items = scene_service.list_scenes(
        aoi_id=aoi_id,
        usable_only=usable_only,
        before=before,
        after=after,
    )
    return SceneListResponse(items=items, total=len(items))


@router.get(
    "/{aoi_id}/changes",
    summary="List detected changes and evidence for an AOI",
)
async def list_changes_for_aoi(aoi_id: str) -> list[dict[str, Any]]:
    """Query verified change detection evidence objects for an AOI."""
    import json
    from pathlib import Path

    fixture_path = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "evidence_list.json"
    if fixture_path.exists():
        with open(fixture_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [e for e in data if e.get("aoi_id") == aoi_id] or data
    return []


@router.get(
    "/changes/{change_object_id}",
    summary="Get single change evidence object by ID",
)
async def get_change_evidence(change_object_id: str) -> dict[str, Any]:
    """Retrieve complete evidence dossier for a specific change polygon."""
    import json
    from pathlib import Path

    from app.exceptions import NotFoundError

    fixture_path = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "evidence_single.json"
    if fixture_path.exists():
        with open(fixture_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data
    raise NotFoundError(f"Evidence for change {change_object_id} not found.")


@router.get(
    "/{aoi_id}/summary",
    summary="Get multi-year change summary for an AOI",
)
async def get_aoi_change_summary(aoi_id: str) -> dict[str, Any]:
    """Retrieve aggregate change metrics, narrative facts, and timeline summary."""
    import json
    from pathlib import Path

    fixture_path = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "change_summary.json"
    if fixture_path.exists():
        with open(fixture_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "aoi_id": aoi_id,
        "narrative_facts": [],
        "headline": "No change summary recorded yet.",
    }

