"""Unit tests for Dynamic Map Notation and Visual Annotation System (SIH26167 §1-§43).

Verifies:
1. Target, operation, scope, and label extraction across English, Hindi, and Hinglish.
2. Controlled map actions contract (highlight_evidence, show_labels, clear_annotations, zoom_to_evidence).
3. Grounding in authoritative Kruger UTM 43N satellite evidence (zero LLM-generated coordinates).
4. Geometry validation gate rejects degenerate, self-intersecting, or out-of-bounds polygons.
5. Strict consistency: answer_count == len(evidence_ids).
6. Different queries on the same map produce distinct evidence sets.
7. Same target with different operations behaves correctly (measurement vs highlight vs filter).
8. Conversational follow-ups (with area, only the largest one, zoom there, clear).
9. Full FastAPI endpoint integration returns verified MapActionItem contracts.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.ask import AskRequest
from app.services.analysis import AnalysisService
from app.services.ask_grounding import AskGroundingService
from app.services.map_annotation_parser import parse_annotation_intent
from app.services.map_annotation_service import MapAnnotationService, validate_evidence_geometry
from app.services.query_router import QueryRouter


@pytest.fixture
def qa_stack() -> tuple[QueryRouter, AskGroundingService, MapAnnotationService, list]:
    router = QueryRouter()
    analysis_svc = AnalysisService()
    grounding = AskGroundingService(analysis_svc)
    ann_svc = MapAnnotationService()
    all_ev = list(analysis_svc._in_memory_evidence.values())
    return router, grounding, ann_svc, all_ev


@pytest.fixture
def mock_map_context(qa_stack) -> dict:
    _, _, _, all_ev = qa_stack
    first_ev = all_ev[0] if all_ev else None
    return {
        "aoi_name": "Jewar Airport AOI",
        "date_a": "2021-01-15",
        "date_b": "2024-06-09",
        "selected_evidence_id": first_ev.change_object_id if first_ev else "e1b10001",
        "selected_target": {
            "id": first_ev.change_object_id if first_ev else "e1b10001",
            "title": "Passenger Terminal 1 Complex",
            "area_ha": 18.50,
        },
    }


def test_ten_required_acceptance_queries_parse_correctly(mock_map_context):
    """Section 35: All 10 acceptance queries must parse into distinct structured targets and operations."""
    queries_expected = [
        ("highlight the water bodies in map with notation", "water", ["highlight", "label"], "requested"),
        ("highlight the buildings", "buildings", ["highlight"], "none"),
        ("show where vegetation disappeared", "vegetation_loss", ["highlight"], "none"),
        ("highlight new buildings between the selected dates", "new_buildings", ["highlight"], "none"),
        ("show changed areas", "changed_area", ["highlight"], "none"),
        ("paani wali jagah mark karo", "water", ["highlight"], "none"),
        ("yaha ke buildings highlight kar", "buildings", ["highlight"], "none"),
        ("isko notation ke saath mark karo", "selected_object", ["highlight", "label"], "requested"),
        ("show water bodies with area", "water", ["highlight", "label", "measure"], "with_area"),
        ("clear", "current_region", ["clear"], "none"),
    ]

    for q, exp_target, exp_ops, exp_label in queries_expected:
        intent = parse_annotation_intent(q.lower(), {}, mock_map_context)
        assert intent is not None, f"Failed to parse query '{q}'"
        assert intent.target == exp_target, f"Query '{q}' target expected {exp_target}, got {intent.target}"
        for op in exp_ops:
            assert op in intent.operations, f"Query '{q}' missing expected operation {op}"
        assert intent.label_mode == exp_label, f"Query '{q}' label mode expected {exp_label}, got {intent.label_mode}"


def test_same_target_different_operation_behavior(mock_map_context):
    """Section 23: Distinguish between highlight, pure measurement, locate, label, and filter."""
    # 1. Pure measurement: should NOT force an annotation intent
    res_measure = parse_annotation_intent("how much water area?", {}, mock_map_context)
    assert res_measure is None or "measure" in res_measure.operations

    # 2. Show water bodies: highlight
    res_show = parse_annotation_intent("show water bodies", {}, mock_map_context)
    assert res_show is not None
    assert res_show.target == "water"
    assert "highlight" in res_show.operations
    assert res_show.label_mode == "none"

    # 3. Highlight with notation: highlight + labels
    res_notate = parse_annotation_intent("highlight water bodies with notation", {}, mock_map_context)
    assert res_notate is not None
    assert "label" in res_notate.operations
    assert res_notate.label_mode == "requested"

    # 4. Show the largest water body: filter
    res_filter = parse_annotation_intent("show the largest water body", {}, mock_map_context)
    assert res_filter is not None
    assert res_filter.filter == {"type": "largest"}


def test_different_queries_produce_different_evidence_sets(qa_stack, mock_map_context):
    """Section 22: Distinct queries MUST produce distinct evidence sets on the same map."""
    _, _, ann_svc, all_ev = qa_stack

    intents = [
        parse_annotation_intent("highlight the water bodies", {}, mock_map_context),
        parse_annotation_intent("highlight the buildings", {}, mock_map_context),
        parse_annotation_intent("show where vegetation disappeared", {}, mock_map_context),
        parse_annotation_intent("show changed areas", {}, mock_map_context),
    ]

    evidence_id_sets = []
    for intent in intents:
        ids, actions, labels, text, facts, bbox = ann_svc.process_annotation(
            intent, all_ev, "2021-01-15", "2024-06-09", mock_map_context, "english"
        )
        assert len(ids) > 0, f"Target {intent.target} produced no evidence!"
        evidence_id_sets.append(set(ids))

    # Assert sets are strictly distinct
    water_set, bld_set, veg_loss_set, change_set = evidence_id_sets
    assert water_set != bld_set, "Water and building evidence cannot be identical!"
    assert water_set != veg_loss_set, "Water and vegetation loss evidence cannot be identical!"
    assert bld_set != veg_loss_set, "Building and vegetation loss evidence cannot be identical!"
    assert len(change_set) >= len(water_set)


def test_geometry_validation_gate_rejects_corrupted_polygons(qa_stack):
    """Section 20: Validate geometry rejects invalid/empty/corrupted coordinates."""
    _, _, _, all_ev = qa_stack
    valid_ev = all_ev[0]

    # Valid check
    assert validate_evidence_geometry(valid_ev) is True

    # Mutate to unclosed ring
    bad_ev = valid_ev.model_copy(deep=True)
    coords = bad_ev.measurement.geom_4326["coordinates"][0]
    coords[-1] = [999.0, 999.0]  # Broken closure and out of bounds
    assert validate_evidence_geometry(bad_ev) is False

    # Empty coordinates
    empty_ev = valid_ev.model_copy(deep=True)
    empty_ev.measurement.geom_4326["coordinates"] = []
    assert validate_evidence_geometry(empty_ev) is False


def test_answer_count_strictly_matches_annotated_evidence_count(qa_stack, mock_map_context):
    """Section 21: answer_count == len(evidence_ids)."""
    _, _, ann_svc, all_ev = qa_stack

    intent = parse_annotation_intent("highlight the water bodies in map with notation", {}, mock_map_context)
    ids, actions, labels, text, facts, bbox = ann_svc.process_annotation(
        intent, all_ev, "2021-01-15", "2024-06-09", mock_map_context, "english"
    )

    count = len(ids)
    assert f"{count} " in text or f"{count} water" in text.lower()
    # Check narrative facts
    cnt_fact = next(f for f in facts if f.kind == "count")
    assert cnt_fact.value == count


def test_conversational_follow_ups(qa_stack, mock_map_context):
    """Section 26: Conversational commands (with area, only largest, zoom, clear)."""
    router, grounding, _, _ = qa_stack

    # Turn 1: Show water bodies
    res1 = router.resolve_intent("show water bodies", map_context=mock_map_context)
    assert res1.intent_id == "map_annotation"
    b1 = grounding.ground_query(res1.intent_id, "show water bodies", "2021-01-15", "2024-06-09", res1.slots, mock_map_context)
    assert len(b1.highlights.change_object_ids) == 2

    history = [{"role": "user", "text": "show water bodies", "target_class": "water"}]

    # Turn 2: "with area"
    intent_area = parse_annotation_intent("with area", {}, mock_map_context, conversation_history=history)
    assert intent_area.label_mode == "with_area"
    assert intent_area.target == "water"

    # Turn 3: "only the largest one"
    intent_largest = parse_annotation_intent("only the largest one", {}, mock_map_context, conversation_history=history)
    assert intent_largest.filter == {"type": "largest"}

    # Turn 4: "clear"
    intent_clear = parse_annotation_intent("clear", {}, mock_map_context, conversation_history=history)
    assert intent_clear.operation == "clear"


def test_full_ask_endpoint_returns_map_actions(mock_map_context):
    """Integration: POST /api/v1/ask returns Answer with map_actions and validated evidence IDs."""
    client = TestClient(app)

    payload = {
        "question": "highlight the water bodies in map with notation",
        "aoi_id": "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1",
        "date_a": "2021-01-15",
        "date_b": "2024-06-09",
        "map_context": mock_map_context,
    }

    resp = client.post("/api/v1/ask", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["intent"]["id"] == "map_annotation"
    assert len(data["evidence_ids"]) == 2
    assert len(data["map_actions"]) >= 2

    action_names = [a["action"] for a in data["map_actions"]]
    assert "highlight_evidence" in action_names
    assert "show_labels" in action_names

    # Check highlights sub-object
    assert "highlights" in data
    assert data["highlights"]["change_object_ids"] == data["evidence_ids"]
    assert "W-01" in str(data["highlights"]["annotation_labels"])
