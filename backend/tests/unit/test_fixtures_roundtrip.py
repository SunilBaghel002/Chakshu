"""Unit test verifying that every contract fixture round-trips cleanly.

Asserts PRD 7 Phase 0 gate item:
"Every schema in data-contracts.md round-trips through its fixture"
"""

import json
from pathlib import Path

from app.schemas.ask import Answer
from app.schemas.detection import DetectionSet
from app.schemas.evidence import Evidence
from app.schemas.summary import ChangeSummary
from app.schemas.trace import Trace

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


def load_fixture(name: str) -> dict[str, object] | list[object]:
    path = FIXTURES_DIR / name
    assert path.exists(), f"Fixture {name} not found at {path}"
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def test_evidence_single_roundtrip() -> None:
    data = load_fixture("evidence_single.json")
    assert isinstance(data, dict)
    evidence = Evidence.model_validate(data)
    assert evidence.change_type == "construction"
    assert evidence.measurement.area_m2 == 18432.5
    # Verify dump matches
    dumped = evidence.model_dump(mode="json")
    assert dumped["change_object_id"] == data["change_object_id"]


def test_evidence_list_roundtrip() -> None:
    data = load_fixture("evidence_list.json")
    assert isinstance(data, list)
    items = [Evidence.model_validate(item) for item in data]
    assert len(items) >= 1
    assert items[0].measurement.kind == "MEASURED"


def test_upload_georeferenced_roundtrip() -> None:
    data = load_fixture("upload_georeferenced.json")
    assert isinstance(data, dict)
    det_set = DetectionSet.model_validate(data)
    assert det_set.upload.capability_tier == "T3_MEDIUM"
    assert len(det_set.detections) == 2
    assert det_set.counts.total_object_detections == 12


def test_upload_visual_only_roundtrip() -> None:
    data = load_fixture("upload_visual_only.json")
    assert isinstance(data, dict)
    det_set = DetectionSet.model_validate(data)
    assert det_set.upload.status == "VISUAL_ONLY"
    assert det_set.upload.crs_epsg is None
    assert det_set.upload.bounds_4326 is None
    assert det_set.upload.gsd_m is None


def test_upload_unknown_gsd_roundtrip() -> None:
    data = load_fixture("upload_unknown_gsd.json")
    assert isinstance(data, dict)
    det_set = DetectionSet.model_validate(data)
    assert det_set.upload.capability_tier == "T0_UNKNOWN"
    assert det_set.upload.capability_notice is not None


def test_change_summary_roundtrip() -> None:
    data = load_fixture("change_summary.json")
    assert isinstance(data, dict)
    summary = ChangeSummary.model_validate(data)
    assert summary.window.years == 3.0
    assert len(summary.by_type) == 3
    assert len(summary.narrative_facts) == 7


def test_answer_fixtures_roundtrip() -> None:
    for name in ["answer_polished.json", "answer_degraded.json", "answer_unsupported.json"]:
        data = load_fixture(name)
        assert isinstance(data, dict)
        answer = Answer.model_validate(data)
        assert answer.answer_id.startswith("ans_")
        assert answer.confidence is not None


def test_trace_roundtrip() -> None:
    data = load_fixture("trace.json")
    assert isinstance(data, dict)
    trace = Trace.model_validate(data)
    assert trace.trace_id == "t_4471e2f3a4b5"
    assert trace.verifier_verdict == "PASS"
    assert len(trace.rejections) == 1
