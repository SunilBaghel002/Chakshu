"""Sentinel-2 archive scene metadata endpoints (Task 1.7, PRD 3 §A2, §A6).

Routes:
  GET /api/v1/scenes/{id}  -> Scene metadata
  GET /api/v1/scenes       -> query scenes across all AOIs
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.schemas.aoi import Scene, SceneListResponse
from app.services.scene_service import scene_service

router = APIRouter(prefix="/scenes", tags=["Scenes"])


@router.get(
    "",
    response_model=SceneListResponse,
    summary="Query archive scenes",
)
async def list_scenes(
    aoi_id: str | None = Query(default=None, description="Filter by enclosing AOI ID"),
    usable_only: bool = Query(default=False, description="Filter for usable scenes only"),
    before: str | None = Query(default=None, description="Acquisition date upper bound"),
    after: str | None = Query(default=None, description="Acquisition date lower bound"),
) -> SceneListResponse:
    """Retrieve archive scenes matching temporal and spatial filters."""
    items = scene_service.list_scenes(
        aoi_id=aoi_id,
        usable_only=usable_only,
        before=before,
        after=after,
    )
    return SceneListResponse(items=items, total=len(items))


@router.get(
    "/{scene_id}",
    response_model=Scene,
    summary="Get scene details by ID",
)
async def get_scene(scene_id: str) -> Scene:
    """Fetch complete metadata and provenance for a single Sentinel-2 scene."""
    return scene_service.get_scene(scene_id)
