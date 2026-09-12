"""Resolution Gate and Capability Tier resolution for Chakshu.

Pure functions only (no I/O, no framework, no DB).
Enforces the fundamental architectural constraint from PRD 2 §5 and PRD 1 §4:
Ground sample distance (GSD) dictates what can honestly be detected or measured.
"""

from __future__ import annotations

from typing import Any

CAPABILITY_TIERS: dict[str, dict[str, Any]] = {
    "T1_VERY_HIGH": {
        "max_gsd_m": 1.0,
        "object_classes": [
            "building",
            "vehicle",
            "aircraft",
            "ship",
            "storage_tank",
            "swimming_pool",
            "tower",
            "container",
            "road",
        ],
        "landcover_classes": ["built", "water", "vegetation", "bare", "crop", "snow"],
        "area_measurements": True,
    },
    "T2_HIGH": {
        "max_gsd_m": 5.0,
        "object_classes": ["building", "ship", "aircraft", "storage_tank", "tower", "road"],
        "landcover_classes": ["built", "water", "vegetation", "bare", "crop", "snow"],
        "area_measurements": True,
    },
    "T3_MEDIUM": {
        "max_gsd_m": 15.0,  # Sentinel-2 (10 m) lands here
        "object_classes": ["building_cluster", "ship_large", "storage_tank", "road"],
        "landcover_classes": ["built", "water", "vegetation", "bare", "crop", "snow"],
        "area_measurements": True,
    },
    "T4_COARSE": {
        "max_gsd_m": float("inf"),
        "object_classes": [],
        "landcover_classes": ["built", "water", "vegetation", "bare", "crop", "snow"],
        "area_measurements": True,
    },
    "T0_UNKNOWN": {
        "max_gsd_m": None,
        "object_classes": [],
        "landcover_classes": [],
        "area_measurements": False,
    },
}


def resolve_tier(gsd_m: float | None, gsd_source: str | None = None) -> str:
    """Classify an image into a capability tier from its GSD and provenance source.

    Rules:
      1. If gsd_m is None or negative, returns T0_UNKNOWN.
      2. If gsd_source == 'assumed', tier can never be better than T3_MEDIUM.
      3. Otherwise:
         - gsd_m <= 1.0   -> T1_VERY_HIGH
         - gsd_m <= 5.0   -> T2_HIGH
         - gsd_m <= 15.0  -> T3_MEDIUM
         - gsd_m > 15.0   -> T4_COARSE
    """
    if gsd_m is None or gsd_m <= 0:
        return "T0_UNKNOWN"

    tier: str
    if gsd_m <= 1.0:
        tier = "T1_VERY_HIGH"
    elif gsd_m <= 5.0:
        tier = "T2_HIGH"
    elif gsd_m <= 15.0:
        tier = "T3_MEDIUM"
    else:
        tier = "T4_COARSE"

    # Rule 1: An assumed GSD can never yield better than T3_MEDIUM
    if gsd_source == "assumed" and tier in ("T1_VERY_HIGH", "T2_HIGH"):
        return "T3_MEDIUM"

    return tier


def permitted_labels(tier: str) -> tuple[set[str], set[str]]:
    """Return permitted (object_classes, landcover_classes) for a given tier."""
    spec = CAPABILITY_TIERS.get(tier, CAPABILITY_TIERS["T0_UNKNOWN"])
    objects = set(spec.get("object_classes", []))
    landcover = set(spec.get("landcover_classes", []))
    return objects, landcover


def can_measure_area(tier: str) -> bool:
    """Return whether area measurements in m² are trustworthy at this tier."""
    spec = CAPABILITY_TIERS.get(tier, CAPABILITY_TIERS["T0_UNKNOWN"])
    return bool(spec.get("area_measurements", False))
