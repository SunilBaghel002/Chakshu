"""Search API endpoints for semantic and similarity tile retrieval (Task 4.3, PRD 3 §A3-A4)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, Form, UploadFile
from pydantic import BaseModel, ConfigDict, Field

from app.services.retrieval import RetrievalFilter, RetrievalService, TileSearchResult

router = APIRouter(prefix="/search", tags=["Search"])
retrieval_service = RetrievalService()


class SemanticSearchRequest(BaseModel):
    """Payload for natural language semantic tile search."""

    model_config = ConfigDict(extra="ignore")

    query: str = Field(..., description="Natural language search query, e.g. 'newly built structures near a river'")
    aoi_id: str | None = Field(default=None, description="Filter by AOI UUID")
    start_date: str | None = Field(default=None, description="Start date YYYY-MM-DD")
    end_date: str | None = Field(default=None, description="End date YYYY-MM-DD")
    max_cloud_pct: float | None = Field(default=20.0, description="Max tolerable cloud coverage percentage")
    min_ndvi: float | None = Field(default=None, description="Minimum NDVI threshold")
    max_ndvi: float | None = Field(default=None, description="Maximum NDVI threshold")
    min_ndbi: float | None = Field(default=None, description="Minimum NDBI built-up threshold")
    limit: int = Field(default=12, ge=1, le=100, description="Maximum result items")


class SearchResponse(BaseModel):
    """Response envelope for tile search matches."""

    model_config = ConfigDict(extra="ignore")

    query: str
    count: int
    results: list[dict[str, Any]]


@router.post("/semantic", response_model=SearchResponse)
async def search_semantic(payload: SemanticSearchRequest) -> SearchResponse:
    """Execute semantic kNN cosine search over ingested tiles using CLIP embeddings."""
    filters = RetrievalFilter(
        aoi_id=payload.aoi_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        max_cloud_pct=payload.max_cloud_pct,
        min_ndvi=payload.min_ndvi,
        max_ndvi=payload.max_ndvi,
        min_ndbi=payload.min_ndbi,
        limit=payload.limit,
    )

    results: list[TileSearchResult] = retrieval_service.search_semantic(
        query=payload.query,
        filters=filters,
    )

    return SearchResponse(
        query=payload.query,
        count=len(results),
        results=[r.to_dict() for r in results],
    )


@router.post("/similar", response_model=SearchResponse)
async def search_similar(
    file: UploadFile | None = File(default=None),
    tile_id: str | None = Form(default=None),
    max_cloud_pct: float | None = Form(default=20.0),
    limit: int = Form(default=12),
) -> SearchResponse:
    """Find visually and spectrally similar tiles given an image or existing tile ID."""
    filters = RetrievalFilter(
        max_cloud_pct=max_cloud_pct,
        limit=limit,
    )

    if file is not None:
        contents = await file.read()
        results = retrieval_service.search_similar(contents, filters=filters)
        query_desc = file.filename or "uploaded_image"
    elif tile_id is not None:
        # Resolve tile PNG from tile_id format: {scene_id}_{x}_{y}
        parts = tile_id.rsplit("_", 2)
        if len(parts) == 3:
            scene_id, x, y = parts[0], parts[1], parts[2]
            png_path = retrieval_service.tiles_dir / scene_id / f"{x}_{y}.png"
            if png_path.exists():
                results = retrieval_service.search_similar(png_path, filters=filters)
            else:
                results = []
        else:
            results = []
        query_desc = f"tile:{tile_id}"
    else:
        return SearchResponse(query="none", count=0, results=[])

    return SearchResponse(
        query=query_desc,
        count=len(results),
        results=[r.to_dict() for r in results],
    )


@router.get("/similar", response_model=SearchResponse)
async def get_search_similar(
    tile_id: str,
    max_cloud_pct: float | None = 20.0,
    limit: int = 12,
) -> SearchResponse:
    """Find visually similar tiles via GET query parameter tile_id (Task 4.3)."""
    filters = RetrievalFilter(max_cloud_pct=max_cloud_pct, limit=limit)
    parts = tile_id.rsplit("_", 2)
    if len(parts) == 3:
        scene_id, x, y = parts[0], parts[1], parts[2]
        png_path = retrieval_service.tiles_dir / scene_id / f"{x}_{y}.png"
        if png_path.exists():
            results = retrieval_service.search_similar(png_path, filters=filters)
        else:
            results = []
    else:
        results = []
    return SearchResponse(
        query=f"tile:{tile_id}",
        count=len(results),
        results=[r.to_dict() for r in results],
    )
