"""API endpoints for change detection and review (Task 2.5, PRD 3 §A7, §A13).

Routes:
  GET  /api/v1/aoi/{aoi_id}/changes           -> list of Evidence, filtered by SQL predicates
  POST /api/v1/aoi/{aoi_id}/analyse           -> HTTP 202 + JobResponse
  GET  /api/v1/aoi/changes/{change_object_id} -> Evidence by ID
  GET  /api/v1/changes/{change_object_id}     -> Evidence by ID
  POST /api/v1/decisions                      -> Record analyst decision
"""

from __future__ import annotations

import datetime
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Path, Query, status
from pydantic import BaseModel, Field

from app.schemas.aoi import JobResponse
from app.schemas.evidence import Evidence
from app.services.analysis import analysis_service
from app.services.aoi_service import aoi_service
from app.services.jobs import job_manager

router = APIRouter(tags=["Change Detection"])


class DecisionRequest(BaseModel):
    """Payload for analyst review confirmation or rejection."""

    entity_type: str = Field(
        default="change_object", description="Entity type: change_object or detection"
    )
    entity_id: str = Field(..., description="Target change object or detection UUID")
    action: str = Field(..., description="'confirm' to approve, 'reject' to mark false positive")
    note: str | None = Field(default=None, description="Optional analyst review rationale")


class DecisionResponse(BaseModel):
    """Recorded audit decision."""

    id: str
    entity_type: str
    entity_id: str
    action: str
    note: str | None
    actor: str
    recorded_at: str


def build_changes_sql(
    aoi_id: str | None = None,
    types: list[str] | None = None,
    min_area_m2: float | None = None,
    max_area_m2: float | None = None,
    after: str | None = None,
    before: str | None = None,
    min_confidence: float | None = None,
    status: str | None = None,
    sort: str = "area_desc",
    limit: int = 100,
    offset: int = 0,
) -> tuple[str, list[Any]]:
    """Build parameterized SQL query enforcing predicate pushdown per PRD 4 §6."""
    query = """
        SELECT id, aoi_id, change_type, status, area_m2, confidence,
               first_supported, rule_trace, ST_AsGeoJSON(geom) as geom_str
        FROM change_object
        WHERE 1=1
    """
    params: list[Any] = []

    if aoi_id and aoi_id != "default":
        query += " AND aoi_id = %s"
        params.append(aoi_id)

    if types:
        query += " AND change_type = ANY(%s)"
        params.append(types)

    if min_area_m2 is not None:
        query += " AND area_m2 >= %s"
        params.append(min_area_m2)

    if max_area_m2 is not None:
        query += " AND area_m2 <= %s"
        params.append(max_area_m2)

    if after:
        query += " AND first_supported >= %s"
        params.append(after)

    if before:
        query += " AND first_supported <= %s"
        params.append(before)

    if min_confidence is not None:
        query += " AND confidence >= %s"
        params.append(min_confidence)

    if status:
        query += " AND status = %s"
        params.append(status)

    if sort == "area_desc":
        query += " ORDER BY area_m2 DESC"
    elif sort == "onset_asc":
        query += " ORDER BY first_supported ASC NULLS LAST"
    elif sort == "confidence_desc":
        query += " ORDER BY confidence DESC"

    query += " LIMIT %s OFFSET %s;"
    params.extend([limit, offset])
    return query.strip(), params


@router.get(
    "/aoi/{aoi_id}/changes",
    response_model=list[Evidence],
    summary="Query detected change evidence items with SQL predicate filters",
)
async def list_aoi_changes(
    aoi_id: Annotated[str, Path(description="Area of Interest identifier")],
    change_types: Annotated[
        list[str] | None, Query(alias="type", description="Change type filter")
    ] = None,
    min_area_m2: Annotated[float | None, Query(description="Min ground area in m²")] = None,
    max_area_m2: Annotated[float | None, Query(description="Max ground area in m²")] = None,
    after: Annotated[str | None, Query(description="Onset date lower bound")] = None,
    before: Annotated[str | None, Query(description="Onset date upper bound")] = None,
    min_confidence: Annotated[float | None, Query(description="Min confidence score")] = None,
    status: Annotated[str | None, Query(description="Review status filter")] = None,
    sort: Annotated[str, Query(description="Sort order")] = "area_desc",
    limit: Annotated[int, Query(ge=1, le=500, description="Page limit")] = 100,
    offset: Annotated[int, Query(ge=0, description="Page offset")] = 0,
) -> list[Evidence]:
    """Retrieve verified and explainable change polygons for an AOI.

    Every filter is applied directly as a SQL predicate before returning.
    """
    return analysis_service.list_changes(
        aoi_id=aoi_id,
        types=change_types,
        min_area_m2=min_area_m2,
        max_area_m2=max_area_m2,
        after=after,
        before=before,
        min_confidence=min_confidence,
        status=status,
        sort=sort,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/aoi/{aoi_id}/analyse",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger asynchronous change detection analysis for an AOI",
)
async def trigger_aoi_analysis(
    aoi_id: str = Path(..., description="Area of Interest identifier"),
    background_tasks: BackgroundTasks = None,  # type: ignore[assignment]
) -> JobResponse:
    """Enqueue background bi-temporal change detection run for an AOI."""
    # Verify AOI exists
    aoi = aoi_service.get_aoi(aoi_id)

    job = job_manager.create_job(
        job_type="change_analysis",
        metadata={"aoi_id": aoi.id, "name": aoi.name},
    )

    if background_tasks is not None:
        background_tasks.add_task(analysis_service.run_aoi_analysis_job, job.job_id, aoi.id)
    else:
        # Fallback sync run if background_tasks not injected
        analysis_service.run_aoi_analysis_job(job.job_id, aoi.id)

    return job


@router.get(
    "/aoi/changes/{change_object_id}",
    response_model=Evidence,
    summary="Get single change Evidence object",
)
@router.get(
    "/changes/{change_object_id}",
    response_model=Evidence,
    summary="Get single change Evidence object",
)
async def get_change_evidence(
    change_object_id: str = Path(..., description="Change object UUID"),
) -> Evidence:
    """Fetch complete Evidence contract for a single detected change object."""
    return analysis_service.get_change(change_object_id)


@router.post(
    "/decisions",
    response_model=DecisionResponse,
    status_code=status.HTTP_200_OK,
    summary="Record human analyst review decision",
)
async def submit_analyst_decision(
    decision: DecisionRequest,
) -> DecisionResponse:
    """Record confirmation or rejection of a change polygon in the audit log."""
    updated = analysis_service.record_decision(
        change_object_id=decision.entity_id,
        action=decision.action,
        note=decision.note,
    )

    return DecisionResponse(
        id=f"dec_{uuid.uuid4().hex[:12]}",
        entity_type=decision.entity_type,
        entity_id=decision.entity_id,
        action=decision.action,
        note=decision.note,
        actor=updated.analyst.actor or "analyst",
        recorded_at=datetime.datetime.now(datetime.UTC).isoformat(),
    )
