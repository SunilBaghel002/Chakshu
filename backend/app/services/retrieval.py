"""Hybrid vector retrieval service for semantic and image search (Tasks 4.1-4.2, PRD 3 §A3-A4).

Performs kNN cosine distance vector search over tile embeddings with all spatial,
temporal, and spectral filters applied directly inside the SQL query.
Provides offline fallback over cached tile manifests when DB is disconnected.
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

try:
    from app.adapters.clip_encoder import get_clip_encoder
    from app.settings import settings
except ImportError:
    from ..adapters.clip_encoder import get_clip_encoder
    from ..settings import settings

log = logging.getLogger(__name__)


@dataclass
class RetrievalFilter:
    """Filter parameters applied inside search query."""

    aoi_id: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    max_cloud_pct: float | None = 20.0
    min_ndvi: float | None = None
    max_ndvi: float | None = None
    min_ndbi: float | None = None
    limit: int = 12


@dataclass
class TileSearchResult:
    """Ranked tile match returned by semantic or similarity retrieval."""

    tile_id: str
    scene_id: str
    x: int
    y: int
    geom: dict[str, Any]
    cloud_pct: float
    ndvi_mean: float
    ndwi_mean: float
    ndbi_mean: float
    score: float
    png_url: str
    acquired_at: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert result to dictionary representation."""
        return asdict(self)


class RetrievalService:
    """Hybrid kNN cosine search over tile vectors with SQL-level predicate filtering."""

    def __init__(self, tiles_dir: Path | str | None = None) -> None:
        """Initialize retrieval service with storage path and encoder adapter."""
        self.tiles_dir = Path(tiles_dir or settings.TILES_DIR)
        self.clip_adapter = get_clip_encoder()

    def search_semantic(
        self,
        query: str,
        filters: RetrievalFilter | None = None,
        db_url: str | None = None,
    ) -> list[TileSearchResult]:
        """Search tiles matching natural language text query."""
        filters = filters or RetrievalFilter()
        query_vector = self.clip_adapter.embed_text(query)
        return self._search_by_vector(query_vector, filters, db_url)

    def search_similar(
        self,
        image_input: Image.Image | np.ndarray[Any, Any] | bytes | Path,
        filters: RetrievalFilter | None = None,
        db_url: str | None = None,
    ) -> list[TileSearchResult]:
        """Search tiles visually similar to query image."""
        filters = filters or RetrievalFilter()
        query_vector = self.clip_adapter.embed_image(image_input)
        return self._search_by_vector(query_vector, filters, db_url)

    def _search_by_vector(
        self,
        query_vector: list[float],
        filters: RetrievalFilter,
        db_url: str | None = None,
    ) -> list[TileSearchResult]:
        """Execute hybrid search against PostgreSQL or fallback tile manifests."""
        url = db_url or settings.DATABASE_URL
        if url and not settings.OFFLINE:
            try:
                dsn = url.replace("postgresql+psycopg://", "postgresql://")
                return self._search_db(query_vector, filters, dsn)
            except Exception as exc:
                log.info("Database retrieval unavailable (%s); using manifest fallback", exc)

        return self._search_manifests(query_vector, filters)

    def _search_db(
        self,
        query_vector: list[float],
        filters: RetrievalFilter,
        url: str,
    ) -> list[TileSearchResult]:
        """Execute pgvector cosine distance search with SQL predicates."""
        import psycopg

        vec_str = f"[{','.join(f'{v:.6f}' for v in query_vector)}]"
        where_clauses = ["t.vector IS NOT NULL"]
        params: list[Any] = [vec_str]

        if filters.aoi_id:
            where_clauses.append("s.aoi_id = %s")
            params.append(filters.aoi_id)
        if filters.start_date:
            where_clauses.append("s.acquired_at >= %s")
            params.append(filters.start_date)
        if filters.end_date:
            where_clauses.append("s.acquired_at <= %s")
            params.append(filters.end_date)
        if filters.max_cloud_pct is not None:
            where_clauses.append("t.cloud_pct <= %s")
            params.append(filters.max_cloud_pct)
        if filters.min_ndvi is not None:
            where_clauses.append("t.ndvi_mean >= %s")
            params.append(filters.min_ndvi)
        if filters.max_ndvi is not None:
            where_clauses.append("t.ndvi_mean <= %s")
            params.append(filters.max_ndvi)
        if filters.min_ndbi is not None:
            where_clauses.append("t.ndbi_mean >= %s")
            params.append(filters.min_ndbi)

        params.append(filters.limit)

        sql = f"""
            SELECT
                t.id, t.scene_id, t.x, t.y,
                ST_AsGeoJSON(t.geom) AS geom_json,
                t.cloud_pct, t.ndvi_mean, t.ndwi_mean, t.ndbi_mean,
                1.0 - (t.vector <=> %s::vector) AS cosine_sim,
                s.acquired_at
            FROM tile t
            JOIN scene s ON t.scene_id = s.id
            WHERE {' AND '.join(where_clauses)}
            ORDER BY t.vector <=> %s::vector ASC
            LIMIT %s;
        """
        # Note: vec_str passed twice: once for sim computation, once for ORDER BY
        query_params = [vec_str] + params

        results: list[TileSearchResult] = []
        with psycopg.connect(url, connect_timeout=5) as conn, conn.cursor() as cur:
            cur.execute(sql, query_params)
            for row in cur.fetchall():
                (
                    t_id, scene_id, x, y, geom_json,
                    cloud_pct, ndvi, ndwi, ndbi, sim, acq_at
                ) = row
                results.append(
                    TileSearchResult(
                        tile_id=str(t_id),
                        scene_id=str(scene_id),
                        x=int(x),
                        y=int(y),
                        geom=json.loads(geom_json),
                        cloud_pct=float(cloud_pct),
                        ndvi_mean=float(ndvi or 0.0),
                        ndwi_mean=float(ndwi or 0.0),
                        ndbi_mean=float(ndbi or 0.0),
                        score=float(max(0.0, min(1.0, sim))),
                        png_url=f"/api/v1/tiles/{scene_id}/{x}_{y}.png",
                        acquired_at=str(acq_at) if acq_at else None,
                    )
                )
        return results

    def _search_manifests(
        self,
        query_vector: list[float],
        filters: RetrievalFilter,
    ) -> list[TileSearchResult]:
        """In-memory cosine similarity search over cached tile manifests."""
        q_vec = np.array(query_vector, dtype=np.float32)
        candidates: list[tuple[float, TileSearchResult]] = []

        if not self.tiles_dir.exists():
            return []

        for manifest_path in self.tiles_dir.glob("*/manifest.json"):
            try:
                data = json.loads(manifest_path.read_text(encoding="utf-8"))
            except Exception:
                continue

            scene_id = data.get("scene_id", manifest_path.parent.name)
            for t in data.get("tiles", []):
                # Filter checks
                cloud = float(t.get("cloud_pct", 0.0))
                if filters.max_cloud_pct is not None and cloud > filters.max_cloud_pct:
                    continue
                ndvi = float(t.get("ndvi_mean", 0.0))
                if filters.min_ndvi is not None and ndvi < filters.min_ndvi:
                    continue
                if filters.max_ndvi is not None and ndvi > filters.max_ndvi:
                    continue
                ndbi = float(t.get("ndbi_mean", 0.0))
                if filters.min_ndbi is not None and ndbi < filters.min_ndbi:
                    continue

                t_vec_raw = t.get("vector")
                if not t_vec_raw:
                    continue

                t_vec = np.array(t_vec_raw, dtype=np.float32)
                denom = (np.linalg.norm(q_vec) * np.linalg.norm(t_vec))
                sim = float(np.dot(q_vec, t_vec) / denom) if denom > 0 else 0.0
                score = max(0.0, min(1.0, (sim + 1.0) / 2.0 if sim < 0 else sim))

                x, y = int(t.get("x", 0)), int(t.get("y", 0))
                res = TileSearchResult(
                    tile_id=f"{scene_id}_{x}_{y}",
                    scene_id=scene_id,
                    x=x,
                    y=y,
                    geom=t.get("geom", {}),
                    cloud_pct=cloud,
                    ndvi_mean=ndvi,
                    ndwi_mean=float(t.get("ndwi_mean", 0.0)),
                    ndbi_mean=ndbi,
                    score=round(score, 4),
                    png_url=f"/api/v1/tiles/{scene_id}/{x}_{y}.png",
                )
                candidates.append((score, res))

        candidates.sort(key=lambda item: item[0], reverse=True)
        return [item[1] for item in candidates[:filters.limit]]
