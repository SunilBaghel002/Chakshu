"""Long-running job polling and status endpoints (Task 1.6, PRD 2 §8, PRD 4 §6).

Routes:
  GET /api/v1/jobs/{id}  -> {"job_id", "state", "progress", "result?", "error?"}
  GET /api/v1/jobs       -> {"items": [...], "total": int}
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.schemas.aoi import JobListResponse, JobResponse
from app.services.jobs import job_manager

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get job execution status and progress",
)
async def get_job_status(job_id: str) -> JobResponse:
    """Poll the execution state and progress of an asynchronous job."""
    return job_manager.get_job(job_id)


@router.get(
    "",
    response_model=JobListResponse,
    summary="List recent jobs",
)
async def list_jobs(
    limit: int = Query(default=50, ge=1, le=100, description="Max jobs to return"),
) -> JobListResponse:
    """Retrieve list of recently registered background jobs."""
    items = job_manager.list_jobs(limit=limit)
    return JobListResponse(items=items, total=len(items))
