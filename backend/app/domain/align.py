"""Pure domain module for optical image registration and alignment validation.

Implements 2D Fourier phase correlation (Kuglin & Hines 1975) to detect
sub-pixel and integer translations between temporal satellite observation pairs.

Enforces:
1. 2D Hann window apodization to eliminate border-edge spectral leakage.
2. Normalized cross-power spectrum formulation: R = (F1 * F2*) / (|F1 * F2*| + eps).
3. Sub-pixel quadratic peak interpolation for sub-pixel accuracy.
4. Shift tolerance validation against MAX_REGISTRATION_SHIFT_PX (2.0 px).
5. Architecture purity: zero framework, I/O, network, or DB dependencies.
"""

from __future__ import annotations

import dataclasses
from typing import Any

import numpy as np

try:
    from app.domain.constants import MAX_REGISTRATION_SHIFT_PX
except ImportError:
    from .constants import MAX_REGISTRATION_SHIFT_PX


@dataclasses.dataclass(frozen=True)
class RegistrationResult:
    """Result of 2D phase-correlation shift estimation."""

    aligned: bool
    shift_y: float
    shift_x: float
    shift_magnitude: float
    correlation_score: float
    reason: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to JSON-serializable dictionary."""
        return {
            "aligned": self.aligned,
            "shift_y": round(float(self.shift_y), 4),
            "shift_x": round(float(self.shift_x), 4),
            "shift_magnitude": round(float(self.shift_magnitude), 4),
            "correlation_score": round(float(self.correlation_score), 4),
            "reason": self.reason,
        }


def _create_hann_window(h: int, w: int) -> np.ndarray[Any, Any]:
    """Generate a 2D separable Hann window of shape (h, w)."""
    wy = np.hanning(h)
    wx = np.hanning(w)
    return np.outer(wy, wx).astype(np.float32)


def estimate_phase_correlation(
    ref_band: np.ndarray[Any, Any],
    target_band: np.ndarray[Any, Any],
    max_shift_px: float = MAX_REGISTRATION_SHIFT_PX,
) -> RegistrationResult:
    """Estimate translation shift (dy, dx) between two 2D image arrays using phase correlation.

    Args:
        ref_band: Reference 2D array (e.g., earlier observation).
        target_band: Target 2D array (e.g., later observation).
        max_shift_px: Maximum allowed shift magnitude before flagging misregistration.

    Returns:
        RegistrationResult containing alignment boolean, shift vector, and correlation score.

    """
    if ref_band.ndim != 2 or target_band.ndim != 2:
        raise ValueError(
            f"Both arrays must be 2D. Got ref {ref_band.shape}, target {target_band.shape}."
        )

    if ref_band.shape != target_band.shape:
        raise ValueError(
            f"Array shapes must match exactly: {ref_band.shape} vs {target_band.shape}."
        )

    h, w = ref_band.shape
    if h < 4 or w < 4:
        return RegistrationResult(
            aligned=True,
            shift_y=0.0,
            shift_x=0.0,
            shift_magnitude=0.0,
            correlation_score=1.0,
            reason=None,
        )

    # Cast to float32, replacing NaN or infinities with 0
    ref_f = np.nan_to_num(ref_band, nan=0.0, posinf=0.0, neginf=0.0).astype(np.float32)
    tgt_f = np.nan_to_num(target_band, nan=0.0, posinf=0.0, neginf=0.0).astype(np.float32)

    # Zero-variance check (e.g., completely flat or empty tiles)
    std_ref = float(np.std(ref_f))
    std_tgt = float(np.std(tgt_f))
    if std_ref < 1e-6 or std_tgt < 1e-6:
        return RegistrationResult(
            aligned=True,
            shift_y=0.0,
            shift_x=0.0,
            shift_magnitude=0.0,
            correlation_score=0.5,
            reason="Low variance / uniform input array",
        )

    # Normalize arrays to zero mean and unit variance before windowing
    ref_norm = (ref_f - np.mean(ref_f)) / (std_ref + 1e-7)
    tgt_norm = (tgt_f - np.mean(tgt_f)) / (std_tgt + 1e-7)

    # Apply 2D Hann window to mitigate spectral edge discontinuities
    window = _create_hann_window(h, w)
    w_ref = ref_norm * window
    w_tgt = tgt_norm * window

    # Compute 2D Fast Fourier Transforms
    f_ref = np.fft.fft2(w_ref)
    f_tgt = np.fft.fft2(w_tgt)

    # Cross-power spectrum: R = (F_tgt * F_ref*) / (|F_tgt * F_ref*| + eps)
    # Target displacement relative to reference
    cross_power = f_tgt * np.conj(f_ref)
    abs_cross_power = np.abs(cross_power)

    with np.errstate(divide="ignore", invalid="ignore"):
        r_matrix = np.divide(
            cross_power,
            abs_cross_power + 1e-7,
            out=np.zeros_like(cross_power),
            where=abs_cross_power > 1e-7,
        )

    # Inverse FFT to obtain 2D phase-correlation surface
    corr_surface = np.real(np.fft.ifft2(r_matrix))

    # Find peak in correlation surface
    peak_flat_idx = int(np.argmax(corr_surface))
    py, px = np.unravel_index(peak_flat_idx, (h, w))
    peak_val = float(corr_surface[py, px])

    # Convert peak indices from frequency coordinates to signed spatial shifts
    # Coordinates in [0, N-1] wrap: values > N/2 correspond to negative shifts
    dy_int = py if py <= h // 2 else py - h
    dx_int = px if px <= w // 2 else px - w

    # Sub-pixel quadratic interpolation around integer peak
    # Fit 1D parabola through (p-1, p, p+1) in y and x dimensions
    sub_dy = 0.0
    if 1 <= py < h - 1:
        v_prev = float(corr_surface[py - 1, px])
        v_curr = peak_val
        v_next = float(corr_surface[py + 1, px])
        denom = 2.0 * (v_prev - 2.0 * v_curr + v_next)
        if abs(denom) > 1e-7:
            sub_dy = (v_prev - v_next) / denom
            sub_dy = float(np.clip(sub_dy, -0.5, 0.5))

    sub_dx = 0.0
    if 1 <= px < w - 1:
        v_prev = float(corr_surface[py, px - 1])
        v_curr = peak_val
        v_next = float(corr_surface[py, px + 1])
        denom = 2.0 * (v_prev - 2.0 * v_curr + v_next)
        if abs(denom) > 1e-7:
            sub_dx = (v_prev - v_next) / denom
            sub_dx = float(np.clip(sub_dx, -0.5, 0.5))

    final_dy = float(dy_int + sub_dy)
    final_dx = float(dx_int + sub_dx)
    shift_mag = float(np.sqrt(final_dy**2 + final_dx**2))

    # Correlation score: normalize peak relative to mean correlation surface
    mean_corr = float(np.mean(np.abs(corr_surface)))
    score = float(np.clip(peak_val / (mean_corr * 10.0 + 1e-7), 0.0, 1.0))

    # Tolerance check
    is_aligned = shift_mag <= float(max_shift_px)
    reason = None
    if not is_aligned:
        reason = (
            f"Registration shift ({shift_mag:.2f} px) exceeds tolerance ({max_shift_px:.2f} px)"
        )

    return RegistrationResult(
        aligned=is_aligned,
        shift_y=final_dy,
        shift_x=final_dx,
        shift_magnitude=shift_mag,
        correlation_score=score,
        reason=reason,
    )
