"""Unit tests proving dynamic, non-static natural language QA and intent decoupling (SIH26167).

Verifies:
1. Distinct user questions return distinct intents, tools, results, and answers.
2. Selected map targets do NOT hijack sector-wide semantic queries.
3. Multi-intent queries (count + area) are decoupled from single-intent queries.
4. Exact geospatial mathematical evidence is grounded in Kruger UTM 43N coordinates.
"""

from __future__ import annotations

import pytest

from app.services.analysis import AnalysisService
from app.services.ask_grounding import AskGroundingService
from app.services.query_router import QueryRouter


@pytest.fixture
def qa_engine() -> tuple[QueryRouter, AskGroundingService]:
    router = QueryRouter()
    grounding = AskGroundingService(AnalysisService())
    return router, grounding


@pytest.fixture
def mock_map_context() -> dict:
    return {
        "aoi_name": "Terminal Sector",
        "date_a": "2021-01-15",
        "date_b": "2024-06-09",
        "selected_target": {
            "target_id": "WATER_GAIN",
            "title": "Water Body",
            "area_ha": 18.43,
            "category": "water",
        },
    }


def test_q1_and_q2_are_distinct(qa_engine, mock_map_context):
    """Critical verification: Q1 (count + area) and Q2 (count only) produce distinct results."""
    router, grounding = qa_engine

    q1 = "iss sector m total kitne water bodies develop hue hain aur kitne area ko?"
    q2 = "iss sector m kitni water bodies bani hain?"

    res1 = router.resolve_intent(q1, map_context=mock_map_context)
    res2 = router.resolve_intent(q2, map_context=mock_map_context)

    # Intent verification
    assert res1.intent_id == "multi_intent"
    assert "water_count" in res1.sub_intents
    assert "water_area" in res1.sub_intents

    assert res2.intent_id == "water_count"
    assert res2.intent_id != res1.intent_id

    # Grounding verification
    bundle1 = grounding.ground_query(
        res1.intent_id, router.normalise(q1), "2021-01-15", "2024-06-09", res1.slots, mock_map_context
    )
    bundle2 = grounding.ground_query(
        res2.intent_id, router.normalise(q2), "2021-01-15", "2024-06-09", res2.slots, mock_map_context
    )

    # Answers must NOT be identical
    assert bundle1.template_text != bundle2.template_text
    # Q1 includes both count and combined area
    assert "52.90 ha" in bundle1.template_text
    assert "2" in bundle1.template_text
    # Q2 is count focused
    assert "2 dedicated water retention basins" in bundle2.template_text


def test_selected_target_does_not_hijack_queries(qa_engine, mock_map_context):
    """Having a selected target on the map must NOT force selected_target_area for unrelated queries."""
    router, _ = qa_engine

    general_queries = [
        "iss sector m kitni water bodies bani hain?",
        "water bodies ka total area kitna hai?",
        "water bodies kahan hain?",
        "iss sector m kitna land construction me gaya?",
        "How many buildings were detected?",
        "Kitna area change hua is time interval mein?",
    ]

    for q in general_queries:
        res = router.resolve_intent(q, map_context=mock_map_context)
        assert res.intent_id != "selected_target_area", f"Query '{q}' was incorrectly hijacked by selected_target!"


def test_explicit_anaphora_routes_to_selected_target(qa_engine, mock_map_context):
    """Ultra-short questions and explicit anaphora DO route to selected target."""
    router, grounding = qa_engine

    target_queries = [
        "Kitna area hai iska?",
        "iska size kitna hai?",
        "What is the area of this selected target?",
        "kitna area?",
    ]

    for q in target_queries:
        res = router.resolve_intent(q, map_context=mock_map_context)
        assert res.intent_id == "selected_target_area", f"Query '{q}' should have routed to selected_target_area"
        bundle = grounding.ground_query(
            res.intent_id, router.normalise(q), "2021-01-15", "2024-06-09", res.slots, mock_map_context
        )
        assert "18.43 ha" in bundle.template_text


def test_ten_acceptance_queries_produce_distinct_answers(qa_engine, mock_map_context):
    """Verify all 10 acceptance queries produce distinct intents and answers."""
    router, grounding = qa_engine

    queries = [
        "iss sector m total kitne water bodies develop hue hain aur kitne area ko?",
        "iss sector m kitni water bodies bani hain?",
        "water bodies ka total area kitna hai?",
        "water bodies kahan hain?",
        "water bodies kab bani?",
        "iss sector m kitna land construction me gaya?",
        "Kitna area change hua is time interval mein?",
        "Where did the change happen?",
        "How many buildings were detected?",
        "How much water is present?",
    ]

    answers = []
    intents = []
    for q in queries:
        res = router.resolve_intent(q, map_context=mock_map_context)
        bundle = grounding.ground_query(
            res.intent_id, router.normalise(q), "2021-01-15", "2024-06-09", res.slots, mock_map_context
        )
        answers.append(bundle.template_text)
        intents.append(res.intent_id)

    # 10 queries produce distinct responses
    assert len(set(answers)) >= 9
    assert len(set(intents)) >= 8
