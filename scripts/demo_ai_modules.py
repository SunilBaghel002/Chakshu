#!/usr/bin/env python3
"""Interactive demonstration harness for Chakshu Vector Search & Multimodal Detection Modules.

Demonstrates:
1. Module 1 (Task 1.10 & Phase 4):
   - OpenCLIP ViT-B-32 512-dim embedding of tiles and text queries.
   - Hybrid semantic search with cosine distance and spectral/cloud predicate filtering.
2. Module 2 (Phase 5 — SIH26167 Track):
   - User upload processing, security checks, and GSD Resolution Gate.
   - Resolution refusal: 10m Sentinel-2 image rejects vehicle/aircraft detections with verbatim notice.
   - High-res aerial upload: detects aircraft and buildings, validates bboxes, applies NMS.
   - Deterministic land-cover coverage summary and rejection accounting.
"""

from __future__ import annotations

import io
import json
from pathlib import Path
import sys

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.adapters.clip_encoder import get_clip_encoder
from app.schemas.common import DetectionKind, DetectionTrack, ProvenanceSource
from app.services.detection import DetectionService
from app.services.retrieval import RetrievalFilter, RetrievalService
from app.services.upload_service import UploadService

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def banner(text: str) -> None:
    print("\n" + "=" * 74)
    print(f"  {text.center(70)}")
    print("=" * 74)


def demo_vector_search() -> None:
    banner("MODULE 1: CLIP VECTOR SEARCH ENGINE (TASK 1.10 & PHASE 4)")

    encoder = get_clip_encoder()
    print("1. Loading OpenCLIP ViT-B-32 encoder...")
    print(f"   Encoder status: {'Live Model' if encoder.is_live else 'Deterministic Offline Projection'}")

    sample_query = "newly built structures near a river"
    print(f"\n2. Encoding natural language query: '{sample_query}'")
    q_vec = encoder.embed_text(sample_query)
    print(f"   Vector dimension: {len(q_vec)}")
    print(f"   Sample embedding values: [{q_vec[0]:.4f}, {q_vec[1]:.4f}, {q_vec[2]:.4f}, ...]")

    # Create synthetic test tiles in demo directory
    demo_tiles_dir = REPO_ROOT / "data" / "demo_tiles"
    scene_dir = demo_tiles_dir / "JEWAR_202406_L2A"
    scene_dir.mkdir(parents=True, exist_ok=True)

    # Tile A: Water canal / river
    img_water = Image.new("RGB", (256, 256), color=(20, 80, 210))
    vec_water = encoder.embed_image(img_water)
    img_water.save(scene_dir / "0_0.png")

    # Tile B: Airport construction / built area
    img_built = Image.new("RGB", (256, 256), color=(160, 150, 140))
    vec_built = encoder.embed_image(img_built)
    img_built.save(scene_dir / "1_0.png")

    # Write manifest
    manifest = {
        "scene_id": "JEWAR_202406_L2A",
        "tiles": [
            {
                "x": 0, "y": 0, "cloud_pct": 1.5,
                "ndvi_mean": -0.12, "ndwi_mean": 0.48, "ndbi_mean": -0.15,
                "vector": vec_water, "geom": {},
            },
            {
                "x": 1, "y": 0, "cloud_pct": 2.0,
                "ndvi_mean": 0.18, "ndwi_mean": -0.22, "ndbi_mean": 0.35,
                "vector": vec_built, "geom": {},
            },
        ],
    }
    with (scene_dir / "manifest.json").open("w", encoding="utf-8") as f:
        json.dump(manifest, f)

    retrieval = RetrievalService(tiles_dir=demo_tiles_dir)
    print("\n3. Executing Hybrid kNN Cosine Search (Query: 'river water'):")
    results = retrieval.search_semantic("river water reservoir", filters=RetrievalFilter(limit=2))
    for idx, r in enumerate(results, 1):
        print(f"   Rank #{idx}: Tile ({r.x}, {r.y}) | Cosine Sim: {r.score:.4f} | NDWI: {r.ndwi_mean} | Cloud: {r.cloud_pct}%")


def demo_upload_and_detection() -> None:
    banner("MODULE 2: UPLOAD & MULTIMODAL DETECTION (PHASE 5 — SIH26167)")

    upload_service = UploadService(uploads_dir=REPO_ROOT / "data" / "uploads")
    detection_service = DetectionService()

    # 1. High-resolution drone image
    print("1. Ingesting 0.5m High-Resolution Drone Image (Airfield)...")
    img_high = Image.new("RGB", (600, 600), color=(140, 140, 140))
    buf = io.BytesIO()
    img_high.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    upload_high = upload_service.process_upload(
        file_bytes=png_bytes,
        original_filename="airfield_05m.png",
        title="Noida Airfield Drone Recon",
        user_gsd_m=0.50,
    )

    print(f"   Upload ID: {upload_high.id}")
    print(f"   Status: {upload_high.status.value}")
    print(f"   GSD: {upload_high.gsd_m} m ({upload_high.gsd_source.value})")
    print(f"   Assigned Tier: {upload_high.capability_tier.value}")
    print(f"   Permitted Objects: {upload_high.capabilities.object_classes}")

    # Simulate Gemini proposals including one duplicate to test NMS
    proposals_high = [
        {"label": "airplane", "bbox": [100, 100, 250, 250], "score": 0.94, "reason": "Commercial aircraft on apron"},
        {"label": "jet", "bbox": [105, 105, 255, 255], "score": 0.81, "reason": "Duplicate aircraft proposal"},
        {"label": "building", "bbox": [300, 300, 450, 450], "score": 0.89, "reason": "Hangary maintenance structure"},
    ]

    print("\n2. Executing Multi-Track Detection Pipeline...")
    image_file = REPO_ROOT / "data" / "uploads" / upload_high.id / upload_high.filename
    det_set = detection_service.run_detection_pipeline(upload_high, image_file, synthetic_proposals=proposals_high)

    print(f"   Total Surviving Detections: {len(det_set.detections)}")
    for d in det_set.detections:
        area_str = f"{d.area_m2:.1f} m²" if d.area_m2 else "N/A"
        print(f"   - [{d.track.value.upper()}] {d.label.upper()} ({d.kind.value}) | Score: {d.score:.2f} ({d.score_source}) | Area: {area_str}")

    print(f"\n   Rejection Accounting: {det_set.rejections.count} proposals filtered")
    for r in det_set.rejections.detail:
        print(f"   - Rejected '{r.label_raw}': {r.reason} ({r.detail})")

    # 2. Sentinel-2 10m image demonstrating Resolution Gate Refusal
    banner("RESOLUTION GATE REFUSAL DEMO (10m Sentinel-2 Image)")
    img_s2 = Image.new("RGB", (400, 400), color=(80, 160, 60))
    buf_s2 = io.BytesIO()
    img_s2.save(buf_s2, format="PNG")

    upload_s2 = upload_service.process_upload(
        file_bytes=buf_s2.getvalue(),
        original_filename="sentinel2_jewar_10m.png",
        user_gsd_m=10.0,
    )

    print(f"Resolution: {upload_s2.gsd_m}m -> Tier: {upload_s2.capability_tier.value}")
    print(f"\nCapability Notice (Verbatim PRD Refusal):\n\"{upload_s2.capability_notice}\"")

    proposals_s2 = [
        {"label": "car", "bbox": [50, 50, 80, 80], "score": 0.90, "reason": "Hallucinated car in 10m image"},
        {"label": "buildings", "bbox": [150, 150, 300, 300], "score": 0.88, "reason": "Town building cluster"},
    ]
    det_set_s2 = detection_service.run_detection_pipeline(upload_s2, REPO_ROOT / "data" / "uploads" / upload_s2.id / upload_s2.filename, synthetic_proposals=proposals_s2)

    print(f"\nResult: 'car' detection was rejected: {det_set_s2.rejections.by_reason}")
    surviving_labels = [d.label for d in det_set_s2.detections if d.kind == DetectionKind.BOX]
    print(f"Surviving object detections: {surviving_labels}")


def main() -> None:
    demo_vector_search()
    demo_upload_and_detection()
    banner("ALL DEMONSTRATIONS COMPLETED SUCCESSFULLY")


if __name__ == "__main__":
    main()
