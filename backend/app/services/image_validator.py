"""Image quality and suitability validation for Chakshu satellite analysis.

Pre-analysis checks that run BEFORE any detection or analysis pipeline.
Returns a quality assessment that informs which analysis tools are appropriate.

Checks:
    - Dynamic range (min/max pixel spread)
    - Blur detection (Laplacian variance)
    - Cloud/haze estimation (bright pixel %)
    - Image suitability for specific analysis tasks
    - Band count for multispectral vs RGB determination
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import numpy as np
from PIL import Image

try:
    import cv2  # type: ignore[import-untyped]
except ImportError:
    cv2 = None

log = logging.getLogger(__name__)

# Quality thresholds
BLUR_THRESHOLD: float = 50.0  # Laplacian variance below this = blurry
LOW_CONTRAST_RANGE: float = 30.0  # Dynamic range below this = very low contrast
HIGH_CLOUD_PCT: float = 60.0  # Above this % bright pixels = likely cloudy/hazy
MIN_USEFUL_PIXELS_PCT: float = 10.0  # Must have at least this % non-black/non-white
OVEREXPOSED_THRESHOLD: int = 245  # Pixel value above this = overexposed
UNDEREXPOSED_THRESHOLD: int = 10  # Pixel value below this = underexposed


@dataclass
class ImageQuality:
    """Assessment of image quality for satellite analysis."""

    is_suitable: bool
    blur_score: float  # Higher = sharper; < BLUR_THRESHOLD = blurry
    dynamic_range: float  # Difference between 98th and 2nd percentile
    bright_pixel_pct: float  # % of pixels above OVEREXPOSED_THRESHOLD
    dark_pixel_pct: float  # % of pixels below UNDEREXPOSED_THRESHOLD
    estimated_cloud_pct: float  # Estimated cloud/haze coverage (%)
    is_blurry: bool
    is_low_contrast: bool
    is_mostly_cloud: bool
    is_mostly_dark: bool
    band_count: int
    is_multispectral: bool
    warnings: list[str]
    recommendations: list[str]

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary for API response."""
        return {
            "is_suitable": self.is_suitable,
            "blur_score": round(self.blur_score, 2),
            "dynamic_range": round(self.dynamic_range, 2),
            "bright_pixel_pct": round(self.bright_pixel_pct, 2),
            "dark_pixel_pct": round(self.dark_pixel_pct, 2),
            "estimated_cloud_pct": round(self.estimated_cloud_pct, 2),
            "is_blurry": self.is_blurry,
            "is_low_contrast": self.is_low_contrast,
            "is_mostly_cloud": self.is_mostly_cloud,
            "is_mostly_dark": self.is_mostly_dark,
            "band_count": self.band_count,
            "is_multispectral": self.is_multispectral,
            "warnings": self.warnings,
            "recommendations": self.recommendations,
        }


class ImageValidator:
    """Validates image quality and suitability before analysis."""

    def assess_quality(self, img: Image.Image) -> ImageQuality:
        """Run all quality checks on an image.

        Args:
            img: PIL Image in any mode.

        Returns:
            ImageQuality assessment object.
        """
        warnings: list[str] = []
        recommendations: list[str] = []

        # Determine band count
        if img.mode in ("RGB", "RGBA"):
            band_count = 3 if img.mode == "RGB" else 4
        elif img.mode == "L":
            band_count = 1
        else:
            band_count = len(img.getbands())

        is_multispectral = band_count > 3

        # Convert to RGB for analysis
        rgb_img = img.convert("RGB")
        arr = np.array(rgb_img, dtype=np.uint8)
        gray = np.mean(arr, axis=2).astype(np.uint8)

        # 1. Dynamic range analysis
        p2 = float(np.percentile(gray, 2))
        p98 = float(np.percentile(gray, 98))
        dynamic_range = p98 - p2

        is_low_contrast = dynamic_range < LOW_CONTRAST_RANGE
        if is_low_contrast:
            warnings.append(
                f"Very low contrast (dynamic range {dynamic_range:.0f}/255). "
                "Results may be unreliable."
            )
            recommendations.append(
                "Consider histogram equalization or using a better source image."
            )

        # 2. Blur detection
        blur_score = self._compute_blur_score(gray)
        is_blurry = blur_score < BLUR_THRESHOLD
        if is_blurry:
            warnings.append(
                f"Image appears blurry (sharpness score {blur_score:.1f}, "
                f"threshold {BLUR_THRESHOLD}). Object detection accuracy may be reduced."
            )

        # 3. Bright pixel analysis (cloud/haze estimation)
        bright_pixels = np.count_nonzero(gray > OVEREXPOSED_THRESHOLD)
        total_pixels = gray.size
        bright_pct = (bright_pixels / total_pixels) * 100.0

        # More nuanced cloud estimation: check for white/near-white with low saturation
        estimated_cloud_pct = self._estimate_cloud_coverage(arr)
        is_mostly_cloud = estimated_cloud_pct > HIGH_CLOUD_PCT
        if is_mostly_cloud:
            warnings.append(
                f"Estimated {estimated_cloud_pct:.0f}% cloud/haze coverage. "
                "Analysis results may not reflect ground conditions."
            )
            recommendations.append("Use a clearer image for more reliable results.")

        # 4. Dark pixel analysis
        dark_pixels = np.count_nonzero(gray < UNDEREXPOSED_THRESHOLD)
        dark_pct = (dark_pixels / total_pixels) * 100.0
        is_mostly_dark = dark_pct > 70.0
        if is_mostly_dark:
            warnings.append(
                f"{dark_pct:.0f}% of pixels are very dark. "
                "The image may be nighttime, heavily shadowed, or corrupted."
            )

        # 5. Check if image has meaningful content
        useful_pct = 100.0 - bright_pct - dark_pct
        if useful_pct < MIN_USEFUL_PIXELS_PCT:
            warnings.append(
                f"Only {useful_pct:.0f}% of pixels are in a useful brightness range. "
                "The image may not contain analyzable satellite imagery."
            )

        # Determine overall suitability
        is_suitable = not (is_mostly_dark or (is_mostly_cloud and is_low_contrast))
        if not is_suitable:
            recommendations.append(
                "This image is not suitable for reliable analysis. "
                "Please provide a clearer satellite/aerial image."
            )

        return ImageQuality(
            is_suitable=is_suitable,
            blur_score=blur_score,
            dynamic_range=dynamic_range,
            bright_pixel_pct=bright_pct,
            dark_pixel_pct=dark_pct,
            estimated_cloud_pct=estimated_cloud_pct,
            is_blurry=is_blurry,
            is_low_contrast=is_low_contrast,
            is_mostly_cloud=is_mostly_cloud,
            is_mostly_dark=is_mostly_dark,
            band_count=band_count,
            is_multispectral=is_multispectral,
            warnings=warnings,
            recommendations=recommendations,
        )

    def _compute_blur_score(self, gray: np.ndarray) -> float:
        """Compute image sharpness using Laplacian variance.

        Higher values = sharper image.
        """
        if cv2 is not None:
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            return float(np.var(laplacian))
        else:
            # NumPy fallback: approximate Laplacian
            from scipy import ndimage

            laplacian = ndimage.laplace(gray.astype(np.float64))
            return float(np.var(laplacian))

    def _estimate_cloud_coverage(self, rgb_arr: np.ndarray) -> float:
        """Estimate cloud coverage from RGB image.

        Clouds are typically: bright, white/grey (low saturation), high luminance.
        """
        r, g, b = (
            rgb_arr[:, :, 0].astype(float),
            rgb_arr[:, :, 1].astype(float),
            rgb_arr[:, :, 2].astype(float),
        )
        luminance = 0.299 * r + 0.587 * g + 0.114 * b

        # Check for bright, low-saturation pixels
        max_rgb = np.maximum(np.maximum(r, g), b)
        min_rgb = np.minimum(np.minimum(r, g), b)
        saturation = np.zeros_like(max_rgb)
        nonzero_mask = max_rgb > 0
        saturation[nonzero_mask] = (max_rgb[nonzero_mask] - min_rgb[nonzero_mask]) / max_rgb[
            nonzero_mask
        ]

        # Cloud = bright + low saturation
        cloud_mask = (luminance > 180) & (saturation < 0.15)
        cloud_pct = (np.count_nonzero(cloud_mask) / cloud_mask.size) * 100.0

        return cloud_pct

    def check_temporal_compatibility(
        self,
        img_a: Image.Image,
        img_b: Image.Image,
        tolerance_pct: float = 20.0,
    ) -> tuple[bool, list[str]]:
        """Check if two images are suitable for temporal comparison.

        Args:
            img_a: Before image.
            img_b: After image.
            tolerance_pct: Acceptable size difference percentage.

        Returns:
            (is_compatible, list of issues)
        """
        issues: list[str] = []

        # Size compatibility
        w_a, h_a = img_a.size
        w_b, h_b = img_b.size
        size_diff_w = abs(w_a - w_b) / max(w_a, w_b) * 100
        size_diff_h = abs(h_a - h_b) / max(h_a, h_b) * 100

        if size_diff_w > tolerance_pct or size_diff_h > tolerance_pct:
            issues.append(
                f"Image sizes differ significantly ({w_a}x{h_a} vs {w_b}x{h_b}). "
                "They may not cover the same geographic region."
            )

        # Mode compatibility
        if img_a.mode != img_b.mode:
            issues.append(
                f"Image modes differ ({img_a.mode} vs {img_b.mode}). "
                "Ensure both are from the same sensor type."
            )

        # Check both are suitable
        qa = self.assess_quality(img_a)
        qb = self.assess_quality(img_b)

        if not qa.is_suitable:
            issues.append("Before image is not suitable for analysis.")
        if not qb.is_suitable:
            issues.append("After image is not suitable for analysis.")

        is_compatible = len(issues) == 0
        return is_compatible, issues
