"""Deterministic Query and Task Router for satellite imagery analysis.

Conforms strictly to SIH26167 §6:
- Converts natural-language user queries into structured analysis requests.
- Maps queries deterministically to specific CV analysis tasks.
- Enforces resolution gate refusals and out-of-scope rejections.
- Never allows arbitrary LLM instructions to directly generate geometry.
"""

from __future__ import annotations

import re
from typing import Any

from app.schemas.analysis import AnalysisTask, RouterOutput


class QueryRouter:
    """Deterministic intent classifier and analysis task selector (§6)."""

    # Resolution gate refusal keywords (e.g. small vehicles at low/medium resolution)
    REFUSAL_KEYWORDS: list[str] = [
        "car", "cars", "vehicle", "vehicles", "truck", "trucks",
        "aircraft", "airplane", "airplanes", "plane", "planes",
        "person", "people", "pedestrian", "bicycle",
    ]

    # Out of scope keywords
    OUT_OF_SCOPE_KEYWORDS: list[str] = [
        "recipe", "capital of", "weather tomorrow", "who is the president",
        "write a poem", "tell me a joke", "python code", "javascript",
        "solve this math", "alien", "aliens", "ufo", "stock price",
    ]

    # Water segmentation keywords
    WATER_KEYWORDS: list[str] = [
        "water", "lake", "lakes", "river", "rivers", "pond", "ponds",
        "ocean", "sea", "reservoir", "waterbody", "waterbodies",
        "wetland", "stream", "canal", "coastline",
    ]

    # Building detection keywords
    BUILDING_KEYWORDS: list[str] = [
        "building", "buildings", "structure", "structures", "roof", "roofs",
        "house", "houses", "built", "built-up", "industrial", "facility",
        "terminal", "hangar", "warehouse", "settlement", "construction",
    ]

    # Vegetation segmentation keywords
    VEGETATION_KEYWORDS: list[str] = [
        "vegetation", "forest", "forests", "tree", "trees", "greenery",
        "canopy", "park", "woods", "plant", "plants", "crop", "crops",
        "agriculture", "field", "fields",
    ]

    # Snow and ice segmentation keywords (§41)
    SNOW_KEYWORDS: list[str] = [
        "snow", "glacier", "ice", "iceberg", "snowpack", "frost",
    ]

    # Change detection keywords
    CHANGE_KEYWORDS: list[str] = [
        "change", "changed", "changes", "difference", "differ", "diff",
        "before and after", "before/after", "compare", "comparison",
        "temporal", "evolution", "growth", "shrinkage", "demolition",
    ]

    # Land-cover classification keywords
    LANDCOVER_KEYWORDS: list[str] = [
        "land cover", "land-cover", "landcover", "land use", "land-use",
        "landuse", "classification", "breakdown", "percentages", "composition",
    ]

    # Scene understanding keywords
    SCENE_KEYWORDS: list[str] = [
        "what is visible", "what can you see", "describe", "description",
        "overview", "scene", "explain this image", "tell me about this image",
        "what does this show", "summary",
    ]

    def route_query(
        self,
        query: str,
        gsd_m: float | None = None,
        has_comparison_image: bool = False,
    ) -> RouterOutput:
        """Route query to structured analysis task request.

        Args:
            query: Raw user query string.
            gsd_m: Ground sample distance in meters if known.
            has_comparison_image: Whether a second image is supplied for temporal comparison.

        Returns:
            Validated RouterOutput schema instance.
        """
        q_clean = query.strip().lower()

        # 1. Check out-of-scope queries
        for kw in self.OUT_OF_SCOPE_KEYWORDS:
            if kw in q_clean:
                return RouterOutput(
                    task=AnalysisTask.UNSUPPORTED,
                    target=None,
                    requires_spatial_evidence=False,
                    requires_polygon=False,
                    reason=f"Query '{kw}' is outside satellite imagery and geospatial analysis scope.",
                )

        # 2. Check Resolution Gate refusals (§2)
        for kw in self.REFUSAL_KEYWORDS:
            # Word-boundary check so 'carpet' or 'carrier' don't falsely match 'car'
            if re.search(rf"\b{re.escape(kw)}\b", q_clean):
                min_gsd = "0.3m" if "car" in kw or "vehicle" in kw else "0.5m"
                curr_gsd_str = f"{gsd_m:.1f}m" if gsd_m is not None else "unknown GSD"
                return RouterOutput(
                    task=AnalysisTask.REFUSAL_RESOLUTION,
                    target=kw,
                    requires_spatial_evidence=False,
                    requires_polygon=False,
                    reason=(
                        f"Objects like '{kw}' cannot be reliably resolved at {curr_gsd_str} "
                        f"(minimum required: {min_gsd} GSD). The resolution gate declines this "
                        "query to prevent fabricated detections."
                    ),
                )

        # 3. Check Change Detection
        if has_comparison_image or any(kw in q_clean for kw in self.CHANGE_KEYWORDS):
            return RouterOutput(
                task=AnalysisTask.CHANGE_DETECTION,
                target="temporal_change",
                requires_spatial_evidence=True,
                requires_polygon=True,
                requires_measurement=True,
                requires_temporal=True,
                reason="Query requests temporal change detection between images.",
            )

        # 4. Check Water Segmentation
        for kw in self.WATER_KEYWORDS:
            if re.search(rf"\b{re.escape(kw)}\b", q_clean):
                return RouterOutput(
                    task=AnalysisTask.WATER_SEGMENTATION,
                    target="water",
                    requires_spatial_evidence=True,
                    requires_polygon=True,
                    requires_measurement=True,
                    reason="Query specifically requests water body segmentation and localization.",
                )

        # 5. Check Building / Built-up Detection
        for kw in self.BUILDING_KEYWORDS:
            if re.search(rf"\b{re.escape(kw)}\b", q_clean):
                return RouterOutput(
                    task=AnalysisTask.BUILDING_DETECTION,
                    target="building",
                    requires_spatial_evidence=True,
                    requires_polygon=True,
                    requires_measurement=True,
                    reason="Query specifically requests building and structural detection.",
                )

        # 6. Check Vegetation Segmentation
        for kw in self.VEGETATION_KEYWORDS:
            if re.search(rf"\b{re.escape(kw)}\b", q_clean):
                return RouterOutput(
                    task=AnalysisTask.VEGETATION_SEGMENTATION,
                    target="vegetation",
                    requires_spatial_evidence=True,
                    requires_polygon=True,
                    requires_measurement=True,
                    reason="Query specifically requests vegetation and green canopy segmentation.",
                )

        # 7. Check Snow / Ice Segmentation (§41)
        for kw in self.SNOW_KEYWORDS:
            if re.search(rf"\b{re.escape(kw)}\b", q_clean):
                return RouterOutput(
                    task=AnalysisTask.SNOW_SEGMENTATION,
                    target="snow",
                    requires_spatial_evidence=True,
                    requires_polygon=True,
                    requires_measurement=True,
                    reason="Query specifically requests snow and ice segmentation.",
                )

        # 8. Check Full Land-Cover Classification
        for kw in self.LANDCOVER_KEYWORDS:
            if kw in q_clean:
                return RouterOutput(
                    task=AnalysisTask.LANDCOVER_CLASSIFICATION,
                    target="all",
                    requires_spatial_evidence=True,
                    requires_polygon=True,
                    requires_measurement=True,
                    reason="User explicitly requested full land-cover mix classification.",
                )

        # 8. Check Scene Understanding (qualitative description)
        for kw in self.SCENE_KEYWORDS:
            if kw in q_clean:
                return RouterOutput(
                    task=AnalysisTask.SCENE_UNDERSTANDING,
                    target=None,
                    requires_spatial_evidence=False,
                    requires_polygon=False,
                    requires_measurement=False,
                    reason="User requested general qualitative scene understanding.",
                )

        # Default fallback: scene understanding without fabricated geometry (§16)
        return RouterOutput(
            task=AnalysisTask.SCENE_UNDERSTANDING,
            target=None,
            requires_spatial_evidence=False,
            requires_polygon=False,
            requires_measurement=False,
            reason="Defaulting to high-level qualitative scene description without spatial geometry.",
        )
