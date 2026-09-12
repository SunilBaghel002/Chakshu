"""Unit tests for hybrid vector retrieval and search API (Tasks 4.2-4.3, PRD 3 §A3-A4)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.adapters.clip_encoder import get_clip_encoder
from app.main import create_app
from app.services.retrieval import RetrievalFilter, RetrievalService


@pytest.fixture
def mock_tiles_dir(tmp_path: Path) -> Path:
    """Create a temporary tile directory with mock scene manifests and vectors."""
    scene_dir = tmp_path / "S2_MOCK_SCENE_01"
    scene_dir.mkdir(parents=True)

    encoder = get_clip_encoder()

    # Tile 1: Water reservoir (blue dominant, low NDVI, high NDWI)
    img_water = Image.new("RGB", (256, 256), color=(20, 80, 220))
    vec_water = encoder.embed_image(img_water)
    img_water.save(scene_dir / "0_0.png")

    # Tile 2: Dense forest (green dominant, high NDVI)
    img_forest = Image.new("RGB", (256, 256), color=(10, 190, 40))
    vec_forest = encoder.embed_image(img_forest)
    img_forest.save(scene_dir / "1_0.png")

    # Tile 3: Cloudy tile (high cloud percentage)
    img_cloud = Image.new("RGB", (256, 256), color=(240, 240, 240))
    vec_cloud = encoder.embed_image(img_cloud)
    img_cloud.save(scene_dir / "0_1.png")

    manifest = {
        "scene_id": "S2_MOCK_SCENE_01",
        "tiles": [
            {
                "x": 0,
                "y": 0,
                "cloud_pct": 2.0,
                "ndvi_mean": -0.15,
                "ndwi_mean": 0.45,
                "ndbi_mean": -0.20,
                "vector": vec_water,
                "geom": {"type": "Polygon", "coordinates": []},
            },
            {
                "x": 1,
                "y": 0,
                "cloud_pct": 5.0,
                "ndvi_mean": 0.78,
                "ndwi_mean": -0.30,
                "ndbi_mean": -0.10,
                "vector": vec_forest,
                "geom": {"type": "Polygon", "coordinates": []},
            },
            {
                "x": 0,
                "y": 1,
                "cloud_pct": 85.0,
                "ndvi_mean": 0.10,
                "ndwi_mean": 0.05,
                "ndbi_mean": 0.05,
                "vector": vec_cloud,
                "geom": {"type": "Polygon", "coordinates": []},
            },
        ],
    }

    with (scene_dir / "manifest.json").open("w", encoding="utf-8") as f:
        json.dump(manifest, f)

    return tmp_path


def test_retrieval_semantic_ranking(mock_tiles_dir: Path) -> None:
    """Semantic search for water ranks water tile highest."""
    service = RetrievalService(tiles_dir=mock_tiles_dir)
    results = service.search_semantic("water reservoir and river lake")

    assert len(results) >= 2
    # The water tile (x=0, y=0) should be ranked first
    assert results[0].x == 0
    assert results[0].y == 0
    assert results[0].ndwi_mean > 0.0


def test_retrieval_cloud_filter(mock_tiles_dir: Path) -> None:
    """Cloud filter discards tiles with cloud percentage above max_cloud_pct."""
    service = RetrievalService(tiles_dir=mock_tiles_dir)
    # Exclude cloud tile (85% cloud)
    results = service.search_semantic(
        "satellite scene",
        filters=RetrievalFilter(max_cloud_pct=20.0),
    )
    for r in results:
        assert r.cloud_pct <= 20.0


def test_retrieval_ndvi_filter(mock_tiles_dir: Path) -> None:
    """NDVI filter retains only tiles within NDVI boundaries."""
    service = RetrievalService(tiles_dir=mock_tiles_dir)
    results = service.search_semantic(
        "green vegetation",
        filters=RetrievalFilter(min_ndvi=0.50),
    )
    assert len(results) == 1
    assert results[0].x == 1
    assert results[0].ndvi_mean >= 0.50


def test_retrieval_image_similarity(mock_tiles_dir: Path) -> None:
    """Image query retrieves visually similar tiles."""
    service = RetrievalService(tiles_dir=mock_tiles_dir)
    query_img = Image.new("RGB", (64, 64), color=(15, 85, 215))

    results = service.search_similar(query_img, filters=RetrievalFilter(max_cloud_pct=20.0))
    assert len(results) >= 1
    assert results[0].x == 0
    assert results[0].y == 0


def test_search_api_endpoint() -> None:
    """Verify FastAPI /api/v1/search/semantic and /health routes."""
    app = create_app()
    client = TestClient(app)

    # Health check should indicate clip is loaded
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["clip_loaded"] is True

    # Semantic search endpoint
    search_resp = client.post(
        "/api/v1/search/semantic",
        json={"query": "water lake reservoir", "limit": 5},
    )
    assert search_resp.status_code == 200
    data = search_resp.json()
    assert data["query"] == "water lake reservoir"
    assert "results" in data
    assert isinstance(data["results"], list)
