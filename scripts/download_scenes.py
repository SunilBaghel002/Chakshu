#!/usr/bin/env python3
"""Sentinel-2 L2A scene acquisition tool against AWS Open Data (PRD 3 §A2, PRD 7 §1.1).

Features:
1. Queries AWS Earth Search STAC API for Sentinel-2 L2A collections.
2. Filters to lowest cloud-cover scene per month across target date range.
3. Downloads bands: B02 (Blue), B03 (Green), B04 (Red), B08 (NIR), B11 (SWIR-1), and SCL.
4. Computes SHA-256 checksums per band and records metadata JSON.
5. Supports offline synthetic scene generation for fast local testing and OFFLINE=1.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import sys
import urllib.request
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger("download_scenes")

STAC_ENDPOINT = "https://earth-search.aws.element84.com/v1/search"
COLLECTION_NAME = "sentinel-2-c1-l2a"

# Predefined Demo AOIs from PRD 1 §5
DEMO_AOIS: dict[str, dict[str, Any]] = {
    "jewar": {
        "name": "Noida International Airport, Jewar",
        "bbox": [77.72, 28.10, 77.80, 28.16],
        "utm_epsg": 32643,
    },
    "bhadla": {
        "name": "Bhadla Solar Park, Rajasthan",
        "bbox": [71.85, 27.50, 72.00, 27.65],
        "utm_epsg": 32643,
    },
}

REQUIRED_BANDS: dict[str, str] = {
    "B02": "blue",
    "B03": "green",
    "B04": "red",
    "B08": "nir",
    "B11": "swir16",
    "SCL": "scl",
}


def calculate_sha256(filepath: Path) -> str:
    """Calculate SHA-256 checksum of a file in 64KB blocks."""
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def query_stac_scenes(
    bbox: list[float],
    start_date: str,
    end_date: str,
    max_cloud: float = 30.0,
) -> list[dict[str, Any]]:
    """Query AWS STAC API for Sentinel-2 L2A scenes overlapping bbox."""
    payload = {
        "collections": [COLLECTION_NAME],
        "bbox": bbox,
        "datetime": f"{start_date}T00:00:00Z/{end_date}T23:59:59Z",
        "query": {"eo:cloud_cover": {"lte": max_cloud}},
        "limit": 100,
    }

    req = urllib.request.Request(
        STAC_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "Chakshu/0.1.0"},
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("features", [])
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        log.error(f"Failed to query STAC API: {exc}")
        return []


def select_monthly_best_scenes(
    features: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Select the lowest cloud-cover scene for each calendar month (YYYY-MM)."""
    monthly: dict[str, dict[str, Any]] = {}

    for feat in features:
        dt_str = feat.get("properties", {}).get("datetime", "")
        if not dt_str:
            continue
        month_key = dt_str[:7]  # YYYY-MM
        cloud = float(feat.get("properties", {}).get("eo:cloud_cover", 100.0))

        if month_key not in monthly or cloud < monthly[month_key]["cloud"]:
            monthly[month_key] = {
                "feature": feat,
                "cloud": cloud,
                "date": dt_str[:10],
                "id": feat["id"],
            }

    return dict(sorted(monthly.items()))


def download_band_file(url: str, dest_path: Path) -> str:
    """Download a band file and return its SHA-256 checksum."""
    if dest_path.exists():
        log.info(f"File already exists: {dest_path.name}")
        return calculate_sha256(dest_path)

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_suffix(".tmp")

    log.info(f"Downloading {dest_path.name} from {url[:80]}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Chakshu/0.1.0"})

    with urllib.request.urlopen(req, timeout=60) as resp, open(temp_path, "wb") as out:
        while chunk := resp.read(65536):
            out.write(chunk)

    temp_path.replace(dest_path)
    return calculate_sha256(dest_path)


def generate_synthetic_scene(
    scene_id: str,
    output_dir: Path,
    aoi_name: str,
    date_str: str,
    is_after: bool = False,
) -> dict[str, Any]:
    """Generate realistic synthetic Sentinel-2 L2A uint16 arrays for testing."""
    import numpy as np

    scene_dir = output_dir / scene_id
    scene_dir.mkdir(parents=True, exist_ok=True)

    # 256x256 tile representation
    h, w = 256, 256
    np.random.seed(abs(hash(scene_id)) % (2**32))

    # Base reflectance: 10000 scale factor
    if aoi_name == "jewar":
        if not is_after:
            # 2021: Agricultural farmland (High NIR, moderate Green, low Red)
            b02 = np.random.randint(200, 600, size=(h, w), dtype=np.uint16)
            b03 = np.random.randint(600, 1200, size=(h, w), dtype=np.uint16)
            b04 = np.random.randint(400, 900, size=(h, w), dtype=np.uint16)
            b08 = np.random.randint(5000, 8000, size=(h, w), dtype=np.uint16)
            b11 = np.random.randint(1000, 2000, size=(h // 2, w // 2), dtype=np.uint16)
            scl = np.full((h // 2, w // 2), 4, dtype=np.uint8)  # 4 = vegetation
        else:
            # 2024-2026: Runway & Terminal built-up (Low NIR, high SWIR & Red)
            b02 = np.random.randint(800, 1400, size=(h, w), dtype=np.uint16)
            b03 = np.random.randint(900, 1600, size=(h, w), dtype=np.uint16)
            b04 = np.random.randint(1200, 2200, size=(h, w), dtype=np.uint16)
            b08 = np.random.randint(1500, 2600, size=(h, w), dtype=np.uint16)
            b11 = np.random.randint(3000, 4800, size=(h // 2, w // 2), dtype=np.uint16)
            scl = np.full((h // 2, w // 2), 5, dtype=np.uint8)  # 5 = non-vegetated
            # Paint runway strip down the center
            b04[110:140, 20:236] = 2800
            b08[110:140, 20:236] = 2200
            b11[55:70, 10:118] = 4500
    else:
        # Bhadla: Desert sand vs Solar Arrays
        b02 = np.random.randint(1200, 1800, size=(h, w), dtype=np.uint16)
        b03 = np.random.randint(1500, 2400, size=(h, w), dtype=np.uint16)
        b04 = np.random.randint(2000, 3200, size=(h, w), dtype=np.uint16)
        b08 = np.random.randint(2200, 3400, size=(h, w), dtype=np.uint16)
        b11 = np.random.randint(3500, 4500, size=(h // 2, w // 2), dtype=np.uint16)
        scl = np.full((h // 2, w // 2), 5, dtype=np.uint8)
        if is_after:
            # Solar panels are dark in VIS-NIR
            b02[40:200, 40:200] = 300
            b04[40:200, 40:200] = 400
            b08[40:200, 40:200] = 500

    checksums: dict[str, str] = {}
    for b_name, b_arr in [
        ("B02", b02),
        ("B03", b03),
        ("B04", b04),
        ("B08", b08),
        ("B11", b11),
        ("SCL", scl),
    ]:
        b_path = scene_dir / f"{b_name}.npy"
        np.save(b_path, b_arr)
        checksums[b_name] = calculate_sha256(b_path)

    meta = {
        "id": scene_id,
        "aoi": aoi_name,
        "acquired_at": date_str,
        "cloud_cover_pct": 1.5,
        "usable": True,
        "unusable_reason": None,
        "sensor": "sentinel-2-l2a",
        "gsd_m": 10.0,
        "checksums": checksums,
        "bands": list(REQUIRED_BANDS.keys()),
        "synthetic": True,
    }

    with open(scene_dir / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    return meta


def main() -> int:
    """CLI entry point for downloading Sentinel-2 scenes."""
    parser = argparse.ArgumentParser(description="Chakshu Sentinel-2 Scene Downloader")
    parser.add_argument(
        "--aoi",
        choices=list(DEMO_AOIS.keys()),
        default="jewar",
        help="Demo site AOI key",
    )
    parser.add_argument("--start", default="2021-01-01", help="Start date YYYY-MM-DD")
    parser.add_argument("--end", default="2026-08-31", help="End date YYYY-MM-DD")
    parser.add_argument(
        "--limit-months", type=int, default=12, help="Max monthly scenes to process"
    )
    parser.add_argument(
        "--out-dir", type=Path, default=Path("data/scenes"), help="Output directory"
    )
    parser.add_argument(
        "--generate-synth",
        action="store_true",
        help="Generate synthetic benchmark scenes offline",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Query STAC and list scenes without downloading",
    )

    args = parser.parse_args()
    aoi_info = DEMO_AOIS[args.aoi]
    log.info(f"Target AOI: {aoi_info['name']} (Bbox: {aoi_info['bbox']})")

    if args.generate_synth or os.environ.get("OFFLINE") == "1":
        log.info("Generating synthetic offline benchmark scenes...")
        s1 = generate_synthetic_scene(
            "S2A_JEWAR_20210315_SYNTH",
            args.out_dir,
            args.aoi,
            "2021-03-15",
            is_after=False,
        )
        s2 = generate_synthetic_scene(
            "S2B_JEWAR_20240420_SYNTH",
            args.out_dir,
            args.aoi,
            "2024-04-20",
            is_after=True,
        )
        log.info(
            f"Generated baseline 2021 ({s1['id']}) and change 2024 ({s2['id']}) successfully."
        )
        return 0

    log.info(f"Querying AWS Open Data STAC between {args.start} and {args.end}...")
    features = query_stac_scenes(aoi_info["bbox"], args.start, args.end)
    log.info(f"Found {len(features)} matching Sentinel-2 scenes.")

    if not features:
        log.warning("No scenes found via STAC. Generating synthetic fallback scenes.")
        generate_synthetic_scene(
            f"S2A_{args.aoi.upper()}_20210315_SYNTH",
            args.out_dir,
            args.aoi,
            "2021-03-15",
            is_after=False,
        )
        generate_synthetic_scene(
            f"S2B_{args.aoi.upper()}_20240420_SYNTH",
            args.out_dir,
            args.aoi,
            "2024-04-20",
            is_after=True,
        )
        return 0

    monthly = select_monthly_best_scenes(features)
    log.info(f"Selected {len(monthly)} monthly-best scenes across target timeframe.")

    processed = 0
    for month, entry in monthly.items():
        if processed >= args.limit_months:
            break
        feat = entry["feature"]
        cloud = entry["cloud"]
        scene_id = feat["id"]
        date_str = entry["date"]
        log.info(f"Month {month}: Scene {scene_id} ({date_str}, Cloud: {cloud:.1f}%)")

        if args.dry_run:
            processed += 1
            continue

        scene_dir = args.out_dir / scene_id
        scene_dir.mkdir(parents=True, exist_ok=True)
        checksums: dict[str, str] = {}

        for band_name, asset_key in REQUIRED_BANDS.items():
            if asset_key in feat.get("assets", {}):
                asset_url = feat["assets"][asset_key]["href"]
                dest_file = scene_dir / f"{band_name}.tif"
                try:
                    csum = download_band_file(asset_url, dest_file)
                    checksums[band_name] = csum
                except (urllib.error.URLError, TimeoutError, OSError) as dl_err:
                    log.error(
                        f"Failed to download {band_name} for {scene_id}: {dl_err}"
                    )

        meta = {
            "id": scene_id,
            "aoi": args.aoi,
            "acquired_at": date_str,
            "cloud_cover_pct": cloud,
            "usable": cloud <= 20.0,
            "unusable_reason": "monsoon cloud cover > 20%" if cloud > 20.0 else None,
            "sensor": "sentinel-2-l2a",
            "gsd_m": 10.0,
            "checksums": checksums,
            "bands": list(REQUIRED_BANDS.keys()),
            "synthetic": False,
        }

        with open(scene_dir / "metadata.json", "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        processed += 1

    log.info(f"Successfully processed {processed} scenes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
