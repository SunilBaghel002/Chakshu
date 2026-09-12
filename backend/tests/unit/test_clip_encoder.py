"""Unit tests for OpenCLIP encoder adapter (Task 1.10, Phase 1 Gate)."""

from __future__ import annotations

import time
import numpy as np
import pytest
from PIL import Image

from app.adapters.clip_encoder import ClipEncoderAdapter, get_clip_encoder


@pytest.fixture
def clip_encoder() -> ClipEncoderAdapter:
    """Fixture providing a ClipEncoderAdapter instance."""
    return ClipEncoderAdapter()


def test_clip_encoder_vector_dimension(clip_encoder: ClipEncoderAdapter) -> None:
    """Verify both image and text embeddings output exactly 512 dimensions."""
    img = Image.new("RGB", (256, 256), color=(50, 100, 200))
    img_vec = clip_encoder.embed_image(img)
    text_vec = clip_encoder.embed_text("satellite imagery of water reservoir")

    assert len(img_vec) == 512
    assert len(text_vec) == 512
    assert all(isinstance(v, float) for v in img_vec)
    assert all(isinstance(v, float) for v in text_vec)


def test_clip_encoder_l2_normalization(clip_encoder: ClipEncoderAdapter) -> None:
    """Verify vector embeddings have unit Euclidean norm."""
    img = Image.new("RGB", (256, 256), color=(20, 180, 50))
    img_vec = np.array(clip_encoder.embed_image(img), dtype=np.float32)
    text_vec = np.array(clip_encoder.embed_text("dense green vegetation"), dtype=np.float32)

    assert pytest.approx(float(np.linalg.norm(img_vec)), abs=1e-4) == 1.0
    assert pytest.approx(float(np.linalg.norm(text_vec)), abs=1e-4) == 1.0


def test_clip_encoder_cpu_latency(clip_encoder: ClipEncoderAdapter) -> None:
    """Verify embedding a 256x256 tile on CPU completes in under 1 second (Phase 1 Gate)."""
    tile_arr = np.random.randint(0, 256, size=(256, 256, 3), dtype=np.uint8)

    start = time.perf_counter()
    _ = clip_encoder.embed_image(tile_arr)
    duration = time.perf_counter() - start

    assert duration < 1.0, f"CLIP embedding took {duration:.3f}s (must be < 1.0s)"


def test_clip_encoder_determinism(clip_encoder: ClipEncoderAdapter) -> None:
    """Verify the same image and query produce identical vectors."""
    img = Image.new("RGB", (64, 64), color=(120, 80, 40))
    vec1 = clip_encoder.embed_image(img)
    vec2 = clip_encoder.embed_image(img)
    assert vec1 == vec2

    query = "solar panel arrays in desert"
    q_vec1 = clip_encoder.embed_text(query)
    q_vec2 = clip_encoder.embed_text(query)
    assert q_vec1 == q_vec2


def test_clip_encoder_singleton() -> None:
    """Verify get_clip_encoder returns a singleton instance."""
    adapter1 = get_clip_encoder()
    adapter2 = get_clip_encoder()
    assert adapter1 is adapter2
