"""Raster PNG tile server for imagery, masks, and evidence triptychs.

Specification: Task 1.8, PRD 3 §A5, §A7, PRD 4 §6.
Routes:
  GET /api/v1/tiles/imagery/{z}/{x}/{y}.png?scene_id=...
  GET /api/v1/tiles/mask/{z}/{x}/{y}.png?change_object_id=...
  GET /api/v1/tiles/evidence/{id}/{stage}.png
"""

from __future__ import annotations

from fastapi import APIRouter, Path, Query, Response

from app.exceptions import ValidationError
from app.services.tile_service import tile_service

router = APIRouter(prefix="/tiles", tags=["Tiles"])


@router.get(
    "/imagery/{z}/{x}/{y}.png",
    response_class=Response,
    summary="Serve true-color RGB imagery tile",
    responses={
        200: {"content": {"image/png": {}}, "description": "256x256 PNG raster tile"},
    },
)
async def get_imagery_tile(
    z: int = Path(..., description="Web Mercator zoom level"),
    x: int = Path(..., description="Tile column index"),
    y: int = Path(..., description="Tile row index"),
    scene_id: str = Query(..., description="Identifier of the Sentinel-2 scene"),
) -> Response:
    """Stream 256x256 contrast-stretched True-Color PNG tile for MapLibre GL."""
    if not scene_id.strip():
        raise ValidationError("scene_id query parameter is required.")

    png_bytes = tile_service.get_imagery_tile(scene_id=scene_id, z=z, x=x, y=y)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get(
    "/mask/{z}/{x}/{y}.png",
    response_class=Response,
    summary="Serve change mask PNG tile",
    responses={
        200: {"content": {"image/png": {}}, "description": "256x256 PNG change mask tile"},
    },
)
async def get_mask_tile(
    z: int = Path(..., description="Web Mercator zoom level"),
    x: int = Path(..., description="Tile column index"),
    y: int = Path(..., description="Tile row index"),
    change_object_id: str | None = Query(default=None, description="Change object ID"),
    scene_id: str | None = Query(default=None, description="Scene ID"),
) -> Response:
    """Stream transparent change mask PNG tile."""
    png_bytes = tile_service.get_mask_tile(
        change_object_id=change_object_id,
        scene_id=scene_id,
        z=z,
        x=x,
        y=y,
    )
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get(
    "/evidence/{evidence_id}/{stage}.png",
    response_class=Response,
    summary="Serve evidence triptych image (before, mask, or after)",
    responses={
        200: {"content": {"image/png": {}}, "description": "Evidence PNG image"},
    },
)
async def get_evidence_stage_image(
    evidence_id: str = Path(..., description="Evidence or change candidate ID"),
    stage: str = Path(..., description="Stage: before, mask, or after"),
) -> Response:
    """Stream triptych verification image for the evidence panel."""
    png_bytes = tile_service.get_evidence_tile(evidence_id=evidence_id, stage=stage)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )
