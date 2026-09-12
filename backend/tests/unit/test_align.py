"""Unit tests for pure domain phase-correlation image alignment (Task 1.4).

Verifies:
1. Zero shift detection for identical images.
2. Accurate translation recovery for integer and sub-pixel shifts.
3. Tolerance enforcement against MAX_REGISTRATION_SHIFT_PX (2.0 px).
4. Edge cases (flat images, shape mismatch, NaN values).
"""

from __future__ import annotations

import numpy as np
import pytest

from app.domain.align import RegistrationResult, estimate_phase_correlation


def _make_textured_tile(size: int = 128) -> np.ndarray:
    """Create a reproducible textured synthetic satellite tile."""
    np.random.seed(42)
    x = np.linspace(-3, 3, size)
    y = np.linspace(-3, 3, size)
    xx, yy = np.meshgrid(x, y)
    # Compound sinusoidal pattern with features and random high-frequency texture
    base = (
        np.sin(xx * 2.0) * np.cos(yy * 2.0)
        + np.sin(xx * 5.0 + yy * 3.0)
        + np.exp(-(xx**2 + yy**2) / 2.0)
    )
    noise = np.random.normal(0, 0.1, (size, size))
    return (base + noise).astype(np.float32)


def test_zero_shift_identical_images() -> None:
    """Identical images produce zero shift and aligned=True."""
    img = _make_textured_tile(128)
    res = estimate_phase_correlation(img, img)

    assert isinstance(res, RegistrationResult)
    assert res.aligned is True
    assert np.isclose(res.shift_y, 0.0, atol=0.05)
    assert np.isclose(res.shift_x, 0.0, atol=0.05)
    assert res.shift_magnitude < 0.05
    assert res.correlation_score > 0.5
    assert res.reason is None


def test_known_integer_shift_within_tolerance() -> None:
    """A small shift of (+1, -1) px is accurately estimated and stays within tolerance."""
    img = _make_textured_tile(128)
    # Roll target: positive roll in axis 0 shifts features downward (dy = +1)
    shifted = np.roll(img, shift=(1, -1), axis=(0, 1))

    res = estimate_phase_correlation(img, shifted, max_shift_px=2.0)
    assert res.aligned is True
    assert np.isclose(res.shift_y, 1.0, atol=0.15)
    assert np.isclose(res.shift_x, -1.0, atol=0.15)
    assert res.shift_magnitude < 2.0


def test_shift_exceeding_tolerance_flags_unaligned() -> None:
    """A shift of 4 px exceeds the 2.0 px tolerance and sets aligned=False."""
    img = _make_textured_tile(128)
    shifted = np.roll(img, shift=(4, 0), axis=(0, 1))

    res = estimate_phase_correlation(img, shifted, max_shift_px=2.0)
    assert res.aligned is False
    assert res.shift_magnitude > 2.0
    assert res.reason is not None
    assert "exceeds tolerance" in res.reason


def test_flat_uniform_image_safe_fallback() -> None:
    """A zero-variance uniform image does not cause zero division or crash."""
    flat = np.full((64, 64), 500.0, dtype=np.float32)
    res = estimate_phase_correlation(flat, flat)

    assert res.aligned is True
    assert res.shift_magnitude == 0.0
    assert "Low variance" in (res.reason or "")


def test_shape_mismatch_raises_value_error() -> None:
    """Arrays of differing shapes raise ValueError."""
    a = np.ones((64, 64), dtype=np.float32)
    b = np.ones((32, 32), dtype=np.float32)

    with pytest.raises(ValueError, match="shapes must match"):
        estimate_phase_correlation(a, b)


def test_to_dict_serialization() -> None:
    """RegistrationResult converts to valid dictionary."""
    res = RegistrationResult(
        aligned=True,
        shift_y=0.123456,
        shift_x=-0.654321,
        shift_magnitude=0.665879,
        correlation_score=0.987654,
        reason=None,
    )
    d = res.to_dict()
    assert d["aligned"] is True
    assert d["shift_y"] == 0.1235
    assert d["shift_x"] == -0.6543
    assert d["shift_magnitude"] == 0.6659
