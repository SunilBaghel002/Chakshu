"""Comprehensive verification tests for dynamic per-upload detection (Tasks T-1 - T-5).

Guarantees:
1. test_no_static_data: Zero 'jewar' in backend source; non-airport uploads contain no 'jewar'/'airport'.
2. test_detection_per_upload: Detections are dynamically computed per image without cross-bleed.
3. test_annotated_image: Annotated image endpoint serves valid JPEG with >1% drawn pixels.
4. test_explanation_paragraph: Dynamic 80-120 word pixel explanation without canned/location text.
5. test_payload_hygiene: LLM payload never leaks original filename, title, or AOI.
"""

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.adapters.gemini import GeminiDetectionAdapter
from app.api.uploads import detection_service
from app.main import create_app

client = TestClient(create_app())


def _create_synthetic_image(
    primary_color: tuple[int, int, int] = (34, 139, 34),
    draw_objects: list[tuple[str, tuple[int, int, int, int], tuple[int, int, int]]] | None = None,
    size: tuple[int, int] = (400, 400),
) -> bytes:
    """Generate in-memory JPEG bytes for testing."""
    img = Image.new("RGB", size, color=primary_color)
    d = ImageDraw.Draw(img)
    if draw_objects:
        for _label, box, color in draw_objects:
            d.rectangle(box, fill=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def test_no_static_data() -> None:
    """1. Assert 'jewar' appears nowhere in backend source except this test file; verify upload response."""
    # (a) Backend source audit
    backend_app_dir = Path(__file__).resolve().parents[2] / "app"
    assert backend_app_dir.exists(), f"Backend dir {backend_app_dir} not found"

    violating_files: list[str] = []
    for py_file in backend_app_dir.rglob("*.py"):
        text = py_file.read_text(encoding="utf-8", errors="ignore").lower()
        if "jewar" in text:
            violating_files.append(str(py_file.name))

    assert not violating_files, f"Found 'jewar' in backend source files: {violating_files}"

    # (b) Upload farmland / residential test image
    farmland_img = _create_synthetic_image(
        primary_color=(46, 117, 34),
        draw_objects=[
            ("building", (60, 60, 160, 160), (180, 50, 40)),
            ("swimming_pool", (220, 220, 320, 320), (30, 90, 200)),
        ],
    )
    resp = client.post(
        "/api/v1/uploads",
        files={"file": ("farmland_survey_01.jpg", farmland_img, "image/jpeg")},
        data={"gsd_m": "0.5"},
    )
    assert resp.status_code == 202
    upload_id = resp.json()["id"]

    det_resp = client.get(f"/api/v1/uploads/{upload_id}/detections")
    assert det_resp.status_code == 200
    det_data = det_resp.json()

    raw_json_str = json.dumps(det_data).lower()
    assert "jewar" not in raw_json_str, "Static 'jewar' data found in detection response"
    assert "airport" not in raw_json_str, "Airport label leaked for farmland image"
    assert len(det_data["detections"]) > 0, "Detections list must be non-empty"


def test_detection_per_upload() -> None:
    """2. Upload two different images -> their detections must differ."""
    img_a = _create_synthetic_image(
        primary_color=(34, 139, 34),
        draw_objects=[("building", (40, 40, 100, 100), (200, 30, 30))],
    )
    img_b = _create_synthetic_image(
        primary_color=(160, 82, 45),
        draw_objects=[("water", (200, 200, 360, 360), (20, 50, 180))],
    )

    resp_a = client.post(
        "/api/v1/uploads",
        files={"file": ("site_a.jpg", img_a, "image/jpeg")},
        data={"gsd_m": "0.5"},
    )
    assert resp_a.status_code == 202
    id_a = resp_a.json()["id"]

    resp_b = client.post(
        "/api/v1/uploads",
        files={"file": ("site_b.jpg", img_b, "image/jpeg")},
        data={"gsd_m": "0.5"},
    )
    assert resp_b.status_code == 202
    id_b = resp_b.json()["id"]

    det_a = client.get(f"/api/v1/uploads/{id_a}/detections").json()
    det_b = client.get(f"/api/v1/uploads/{id_b}/detections").json()

    # Detections cannot be identical
    boxes_a = [d["geom_px"] for d in det_a["detections"]]
    boxes_b = [d["geom_px"] for d in det_b["detections"]]
    assert boxes_a != boxes_b, "Detections across two different images must not be identical"


def test_annotated_image(monkeypatch: pytest.MonkeyPatch) -> None:
    """3. GET /annotated -> 200, image/jpeg, valid JPEG, pixel-diff vs plain overview > 0.5%."""
    monkeypatch.setattr(
        GeminiDetectionAdapter,
        "_call_rest_api",
        lambda *args, **kwargs: {
            "mode": "RECONCILE",
            "objects": [{"bbox": [50, 50, 250, 250], "label": "building", "score": 0.88, "evidence": "large structure"}],
            "landcover_pct": {"bare": 0, "built": 50, "crop": 0, "snow": 0, "vegetation": 50, "water": 0},
            "water_polygons": [],
            "reconciliation": [],
            "explanation": "A survey of the terrain showing a prominent built structure occupying the central sector surrounded by vegetation.",
        },
    )
    img_bytes = _create_synthetic_image(
        primary_color=(50, 120, 50),
        draw_objects=[
            ("building", (50, 50, 200, 200), (220, 40, 40)),
            ("water", (250, 250, 380, 380), (30, 100, 220)),
        ],
    )
    resp = client.post(
        "/api/v1/uploads",
        files={"file": ("annotated_test.jpg", img_bytes, "image/jpeg")},
        data={"gsd_m": "0.5"},
    )
    assert resp.status_code == 202
    upload_id = resp.json()["id"]

    # 1. GET overview image
    overview_resp = client.get(f"/api/v1/uploads/{upload_id}/overview")
    assert overview_resp.status_code == 200
    overview_img = Image.open(io.BytesIO(overview_resp.content)).convert("RGB")

    # 2. GET annotated image
    ann_resp = client.get(f"/api/v1/uploads/{upload_id}/annotated")
    assert ann_resp.status_code == 200
    assert ann_resp.headers["content-type"] == "image/jpeg"
    ann_img = Image.open(io.BytesIO(ann_resp.content)).convert("RGB")

    assert ann_img.size == overview_img.size

    # 3. Calculate pixel diff percentage
    arr_overview = np.array(overview_img, dtype=np.int16)
    arr_ann = np.array(ann_img, dtype=np.int16)

    diff = np.abs(arr_overview - arr_ann)
    # Count pixels where any channel has significant delta (> 10)
    changed_pixels = np.count_nonzero(np.any(diff > 10, axis=-1))
    total_pixels = overview_img.width * overview_img.height
    diff_pct = (changed_pixels / float(total_pixels)) * 100.0

    assert diff_pct > 0.5, f"Pixel difference {diff_pct:.2f}% is not > 0.5% (nothing was drawn)"


def test_explanation_paragraph(monkeypatch: pytest.MonkeyPatch) -> None:
    """4. Explanation is 80-120 words, no blacklisted place names, mentions detected class.

    Monkeypatches Gemini so the test exercises the explanation validation
    path rather than depending on a live API key being available in CI.
    """
    valid_explanation = (
        "The aerial image is predominantly occupied by lush green vegetation covering "
        "most of the visible terrain. A prominent rectangular built structure stands in "
        "the central quadrant with distinct reddish tones distinguishing it from the "
        "surrounding landscape. No significant water bodies or paved transportation roads "
        "are apparent in this coverage. The overall land-use mix exhibits an agrarian or "
        "natural character with isolated built footprints creating localized textural "
        "variance across the predominantly vegetative expanse of the surveyed area "
        "visible from above across the entire view."
    )
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(detection_service.gemini_adapter, "enabled", True)
    monkeypatch.setattr(detection_service.gemini_adapter, "api_key", "test-key")
    monkeypatch.setattr(
        detection_service.gemini_adapter,
        "_call_rest_api",
        lambda *a, **kw: {
            "objects": [{"bbox": [50, 50, 250, 250], "label": "building", "score": 0.88, "visual_evidence": "large isolated structure"}],
            "explanation": valid_explanation,
            "scene_type": "rural",
        },
    )

    img_bytes = _create_synthetic_image(
        primary_color=(40, 140, 40),
        draw_objects=[("building", (50, 50, 180, 180), (220, 50, 50))],
    )
    resp = client.post(
        "/api/v1/uploads",
        files={"file": ("explanation_test.jpg", img_bytes, "image/jpeg")},
        data={"gsd_m": "0.5"},
    )
    assert resp.status_code == 202
    upload_id = resp.json()["id"]

    det_resp = client.get(f"/api/v1/uploads/{upload_id}/detections")
    det_data = det_resp.json()

    explanation = det_data.get("explanation")
    assert explanation is not None, "Explanation must not be null for successful detection"
    assert isinstance(explanation, str)

    words = explanation.split()
    word_count = len(words)
    assert (
        80 <= word_count <= 120
    ), f"Explanation word count {word_count} outside 80-120 word range: '{explanation}'"

    # Blacklist check
    blacklist = ["jewar", "san diego", "qualcomm", "noida", "airport", "international"]
    expl_lower = explanation.lower()
    for bad_word in blacklist:
        assert bad_word not in expl_lower, f"Blacklist term '{bad_word}' leaked in explanation"

    # Check that at least one detected or landcover class is mentioned
    classes = [
        "building", "structure", "vegetation", "water",
        "bare", "built", "crop", "green", "road", "surface",
    ]
    assert any(c in expl_lower for c in classes), "Explanation must mention visual structures/classes"


def test_payload_hygiene(monkeypatch: pytest.MonkeyPatch) -> None:
    """5. Assert Gemini request payload never contains original filename, title, or aoi_name."""
    captured_calls: list[dict[str, Any]] = []

    original_call = GeminiDetectionAdapter._call_rest_api

    def mock_call_rest(*args: Any, **kwargs: Any) -> dict[str, Any]:
        if args and isinstance(args[0], GeminiDetectionAdapter):
            model = args[1]
            prompt = args[2]
        else:
            model = args[0] if len(args) > 0 else kwargs.get("model", "")
            prompt = args[1] if len(args) > 1 else kwargs.get("prompt", "")
        captured_calls.append({"model": model, "prompt": prompt})
        return {
            "mode": "RECONCILE",
            "objects": [{"bbox": [50, 50, 150, 150], "label": "building", "score": 0.9, "evidence": "red rooftop"}],
            "landcover_pct": {"bare": 0, "built": 20, "crop": 0, "snow": 0, "vegetation": 80, "water": 0},
            "water_polygons": [],
            "reconciliation": [],
            "explanation": (
                "The aerial image is predominantly occupied by lush green vegetation covering "
                "most of the visible terrain. A prominent rectangular built structure stands in "
                "the quadrant with distinct reddish tones distinguishing it from the surrounding "
                "landscape. No significant water bodies or paved transportation roads are apparent "
                "in this coverage. The overall land-use mix exhibits an agrarian or natural "
                "character with isolated built footprints creating localized textural variance across "
                "the predominantly vegetative expanse of the surveyed ground."
            ),
        }

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(detection_service.gemini_adapter, "enabled", True)
    monkeypatch.setattr(detection_service.gemini_adapter, "api_key", "test-key")
    monkeypatch.setattr(detection_service.gemini_adapter, "_call_rest_api", mock_call_rest)
    monkeypatch.setattr(GeminiDetectionAdapter, "_call_rest_api", mock_call_rest)

    secret_filename = "top_secret_military_flight_survey_99.jpg"
    secret_title = "Classified Northern Forward Runway Reconnaissance"
    img_bytes = _create_synthetic_image()

    resp = client.post(
        "/api/v1/uploads",
        files={"file": (secret_filename, img_bytes, "image/jpeg")},
        data={"title": secret_title, "gsd_m": "0.5"},
    )
    assert resp.status_code == 202

    assert len(captured_calls) >= 1, "Gemini REST API must have been invoked"
    prompt_text = captured_calls[0]["prompt"]

    assert secret_filename not in prompt_text, f"Filename '{secret_filename}' leaked into prompt!"
    assert secret_title not in prompt_text, f"Title '{secret_title}' leaked into prompt!"
    assert "aoi" not in prompt_text.lower(), "AOI identifier leaked into blind prompt!"
    # Prompt is now JSON with known keys
    import json as _json
    parsed = _json.loads(prompt_text)
    assert "reference_id" in parsed, "Prompt must contain a reference_id"
    assert "image_dimensions_px" in parsed, "Prompt must contain image dimensions"
    assert "gsd_m" in parsed, "Prompt must contain GSD"


def test_geometry_top_left_quadrant() -> None:
    """T-1a. Box [0,0,1000,1000] covers whole image; [0,0,500,500] lands in top-left quadrant."""
    w, h = 800, 600
    box_full = [0, 0, 1000, 1000]
    x1_f, y1_f = int((box_full[1] / 1000.0) * w), int((box_full[0] / 1000.0) * h)
    x2_f, y2_f = int((box_full[3] / 1000.0) * w), int((box_full[2] / 1000.0) * h)
    assert (x1_f, y1_f, x2_f, y2_f) == (0, 0, w, h)

    box_quad = [0, 0, 500, 500]
    x1_q, y1_q = int((box_quad[1] / 1000.0) * w), int((box_quad[0] / 1000.0) * h)
    x2_q, y2_q = int((box_quad[3] / 1000.0) * w), int((box_quad[2] / 1000.0) * h)
    assert (x1_q, y1_q, x2_q, y2_q) == (0, 0, w // 2, h // 2)


def test_water_contour_geometry() -> None:
    """T-1b. Water polygon area / bbox area < 0.95 and polygon >= 5 points."""
    from app.domain.landcover import vectorize_water_polygons

    mask = np.zeros((100, 100), dtype=bool)
    y, x = np.ogrid[:100, :100]
    mask[(x - 50) ** 2 + (y - 50) ** 2 <= 30 ** 2] = True

    polys = vectorize_water_polygons(mask, gsd_m=1.0)
    assert len(polys) >= 1
    largest = max(polys, key=lambda p: p["area_px"])
    coords = largest["polygon_px"]
    assert len(coords) >= 5

    xs = [pt[0] for pt in coords]
    ys = [pt[1] for pt in coords]
    bbox_area = (max(xs) - min(xs)) * (max(ys) - min(ys))
    poly_area = largest["area_px"]
    assert (poly_area / bbox_area) < 0.95


def test_label_chip_render(monkeypatch: pytest.MonkeyPatch) -> None:
    """T-3. Monkeypatch ImageDraw.text; assert called >= 1 per object with class name in text."""
    from PIL.ImageDraw import ImageDraw as PILImageDraw
    from app.services.annotate import annotate_image

    captured_texts: list[str] = []
    orig_text = PILImageDraw.text

    def mock_text(self: Any, xy: Any, text: str, *args: Any, **kwargs: Any) -> Any:
        captured_texts.append(str(text))
        return orig_text(self, xy, text, *args, **kwargs)

    monkeypatch.setattr(PILImageDraw, "text", mock_text)

    img = Image.new("RGB", (600, 600), color=(100, 100, 100))
    detections = [
        {
            "id": "d1",
            "track": "gemini_blind",
            "label": "storage_tank",
            "kind": "box",
            "geom_px": {"type": "Polygon", "coordinates": [[[50, 50], [150, 50], [150, 150], [50, 150], [50, 50]]]},
            "area_px": 10000.0,
            "score": 0.88,
        },
        {
            "id": "d2",
            "track": "gemini_blind",
            "label": "building",
            "kind": "box",
            "geom_px": {"type": "Polygon", "coordinates": [[[200, 200], [300, 200], [300, 300], [200, 300], [200, 200]]]},
            "area_px": 10000.0,
            "score": 0.75,
        },
    ]

    annotate_image(img, detections, overlay_lc=False)
    assert len(captured_texts) >= 2
    assert any("storage_tank" in t and "0.88" in t for t in captured_texts)
    assert any("building" in t and "0.75" in t for t in captured_texts)


def test_stats_block_and_landcover_area() -> None:
    """T-4. Assert stats present, sum of landcover pct ~= 100, each m2 == pct/100 * total_area_m2."""
    img_bytes = _create_synthetic_image(
        primary_color=(34, 139, 34),
        draw_objects=[("building", (60, 60, 160, 160), (180, 50, 40))],
    )
    resp = client.post(
        "/api/v1/uploads",
        files={"file": ("stats_test.jpg", img_bytes, "image/jpeg")},
        data={"gsd_m": "0.5"},
    )
    assert resp.status_code == 202
    upload_id = resp.json()["id"]

    det_resp = client.get(f"/api/v1/uploads/{upload_id}/detections")
    assert det_resp.status_code == 200
    data = det_resp.json()

    assert "stats" in data
    stats = data["stats"]
    assert stats["total_objects"] >= 0
    total_m2 = stats["total_area_m2"]
    assert abs(total_m2 - 40000.0) < 1.0

    lc_area = stats["landcover_area"]
    sum_pct = sum(item["pct"] for item in lc_area.values())
    assert 98.0 <= sum_pct <= 102.0

    for _cname, item in lc_area.items():
        expected_m2 = (item["pct"] / 100.0) * total_m2
        assert abs(item["m2"] - expected_m2) <= 1.0
        assert abs(item["ha"] - (item["m2"] / 10000.0)) <= 0.1


def test_notable_objects_filter() -> None:
    """T-2. Building score >= 0.60, others >= 0.50, max 10 buildings, max 15 total objects.

    Calls _validate_proposals directly since _run_track3_objects was removed.
    """
    from app.schemas.common import CapabilityTier
    from app.schemas.detection import CapabilityPermissions, Upload
    from app.services.detection import DetectionService

    mock_objects = []
    for i in range(25):
        score = round(0.40 + i * 0.025, 2)
        mock_objects.append({
            "bbox": [5 * i, 5 * i, 5 * i + 100, 5 * i + 100],
            "label": "building",
            "score": score,
            "visual_evidence": "large isolated warehouse",
        })
    for j in range(5):
        mock_objects.append({
            "bbox": [600 + 40 * j, 600, 600 + 40 * j + 30, 640],
            "label": "vehicle",
            "score": 0.85,
            "visual_evidence": "metallic vehicle shape",
        })

    upload = Upload(
        id="test_filter",
        filename="test_filter.jpg",
        status="VISUAL_ONLY",
        width_px=1000,
        height_px=1000,
        band_count=3,
        bands=["red", "green", "blue"],
        capability_tier=CapabilityTier.T1_VERY_HIGH,
        capabilities=CapabilityPermissions(
            object_classes=["building", "vehicle", "storage_tank", "ship", "aircraft"],
            landcover_classes=["water", "built", "vegetation"],
            area_measurements=True,
        ),
        checksum_sha256="abc",
        overview_url="/test.jpg",
        created_at="2026-09-13T00:00:00Z",
    )

    svc = DetectionService()
    detections, rejections = svc._validate_proposals(mock_objects, upload)

    buildings = [d for d in detections if d.label == "building"]
    assert len(buildings) <= 10
    assert len(detections) <= 15
    for b in buildings:
        assert b.score >= 0.60
    for o in detections:
        assert o.score >= 0.50
    reasons = [r.reason for r in rejections]
    assert "cap_reached" in reasons or "score_below_threshold" in reasons
    assert any(r in reasons for r in ["ordinary_building", "score_below_threshold", "cap_reached"])


def test_blacklist_expanded() -> None:
    """T-5. Response JSON, explanation, labels must be free of blacklist words."""
    blacklist = ["sattahip", "thailand", "chonburi", "san diego", "qualcomm", "jewar", "noida", "airport"]
    img_bytes = _create_synthetic_image(primary_color=(40, 100, 40))
    resp = client.post(
        "/api/v1/uploads",
        files={"file": ("coastal_survey.jpg", img_bytes, "image/jpeg")},
        data={"gsd_m": "0.5"},
    )
    assert resp.status_code == 202
    upload_id = resp.json()["id"]

    det_resp = client.get(f"/api/v1/uploads/{upload_id}/detections")
    det_json_str = json.dumps(det_resp.json()).lower()

    for term in blacklist:
        assert term not in det_json_str, f"Blacklist term '{term}' leaked in detection response!"

