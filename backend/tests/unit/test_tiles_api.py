"""Unit tests for raster-to-PNG tile serving endpoint (Task 1.8)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services.tile_service import generate_fallback_rgb_tile, tile_service

client = TestClient(create_app())

PNG_MAGIC_BYTES = b"\x89PNG\r\n\x1a\n"


@pytest.fixture(autouse=True)
def ensure_synthetic_scene_tile() -> None:
    """Ensure baseline synthetic tile directory exists for unit testing."""
    scene_dir = tile_service.tiles_dir / "S2A_JEWAR_20210315_SYNTH"
    scene_dir.mkdir(parents=True, exist_ok=True)
    target_tile = scene_dir / "0_0.png"
    if not target_tile.exists():
        target_tile.write_bytes(generate_fallback_rgb_tile("S2A_JEWAR_20210315_SYNTH"))




def test_get_imagery_tile() -> None:
    """Test serving contrast-stretched True-Color PNG tile."""
    scene_id = "S2A_JEWAR_20210315_SYNTH"
    res = client.get(f"/api/v1/tiles/imagery/12/0/0.png?scene_id={scene_id}")
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"
    assert res.content.startswith(PNG_MAGIC_BYTES)
    assert len(res.content) > 100


def test_get_imagery_tile_missing_scene() -> None:
    """Test 404 response for non-existent scene."""
    res = client.get("/api/v1/tiles/imagery/12/0/0.png?scene_id=NON_EXISTENT_SCENE")
    assert res.status_code == 404
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"


def test_get_imagery_tile_missing_param() -> None:
    """Test 422/error when scene_id is omitted."""
    res = client.get("/api/v1/tiles/imagery/12/0/0.png")
    assert res.status_code in {400, 422}


def test_get_mask_tile() -> None:
    """Test serving transparent change mask tile."""
    res = client.get("/api/v1/tiles/mask/12/0/0.png")
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"
    assert res.content.startswith(PNG_MAGIC_BYTES)


def test_get_evidence_stage_tile() -> None:
    """Test serving triptych evidence tile for before, mask, and after stages."""
    for stage in ["before", "mask", "after"]:
        res = client.get(f"/api/v1/tiles/evidence/test_change_1/{stage}.png")
        assert res.status_code == 200
        assert res.headers["content-type"] == "image/png"
        assert res.content.startswith(PNG_MAGIC_BYTES)
