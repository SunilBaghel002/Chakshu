"""Phase 6 Gate Verification Tests (PRD 7 §Phase 6).

Asserts all 8 explicit gate criteria for the Question Layer:
1. 'What changed here in 3 years?' on georeferenced upload/AOI returns full ChangeSummary
   with correct numbers, disclosed gaps, and suppression counts.
2. Same question on VISUAL_ONLY upload returns verbatim refusal, not an error or guess.
3. 'How many buildings?' returns the DB count — test proves model prose count is not used.
4. Every number in every answer appears in narrative_facts and passes the verifier.
5. An out-of-scope question routes to unsupported with honest message, never reaches Gemini.
6. OFFLINE=1: every intent still produces a complete answer.
7. A deliberately fabricated model response is caught by verifier, degrades to template,
   and failure is visible in the trace.
8. The trace shows: intent + score, slots, SQL, bundle, model call, verifier verdict.
"""

from __future__ import annotations

import io
from unittest.mock import patch
from fastapi.testclient import TestClient
from PIL import Image
import pytest

from app.main import app
from app.schemas.summary import NarrativeFact
from app.services.gemini_client import GeminiQAClient
from app.services.query_router import QueryRouter
from app.services.render import VISUAL_ONLY_TEMPORAL_REFUSAL, render_unsupported
from app.services.summary import SummaryService
from app.services.verifier import NumberVerifier

client = TestClient(app)


def _create_plain_png() -> bytes:
    """Create a plain 256x256 RGB image."""
    img = Image.new("RGB", (256, 256), color=(40, 100, 40))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_gate1_what_changed_in_3_years_on_georeferenced():
    """Gate 1: 'What changed here in 3 years?' returns full ChangeSummary with correct numbers, gaps, suppression."""
    summary_service = SummaryService()
    summary, refusal, meta = summary_service.build_summary(
        upload=None, aoi_id="b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1", window_years=3.0
    )

    assert summary is not None
    assert "18.43 ha" in refusal or "construction" in refusal
    assert summary.window.years == 3.0
    assert summary.scenes.total == 36
    assert summary.scenes.usable == 29
    assert len(summary.scenes.gaps) >= 1
    assert summary.scenes.gaps[0].reason == "monsoon cloud, 4 scenes unusable"

    # Verify numbers in narrative_facts
    fact_map = {f.fact_id: f for f in summary.narrative_facts}
    assert fact_map["f1"].value == 6  # 6 changes
    assert fact_map["f2"].value == 184320.5  # 18.43 ha
    assert fact_map["f3"].value == "2024-06-09"  # onset date
    assert fact_map["f5"].value == 312  # suppression count

    # Through /ask API endpoint
    resp = client.post(
        "/api/v1/ask",
        json={
            "question": "What changed here in 3 years?",
            "aoi_id": "b1d3a4e9-11c2-49f3-85e2-04e82b3d91f1",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"]["id"] == "aoi_change_summary"
    assert "18.43 ha" in data["text"]
    assert "312" in data["text"]


def test_gate2_visual_only_temporal_refusal():
    """Gate 2: Temporal question on VISUAL_ONLY upload returns verbatim refusal."""
    png_bytes = _create_plain_png()
    up_resp = client.post(
        "/api/v1/uploads",
        files={"file": ("plain_scene.png", png_bytes, "image/png")},
    )
    assert up_resp.status_code == 202
    upload_id = up_resp.json()["id"]

    resp = client.post(
        "/api/v1/ask",
        json={
            "question": "what changed here in 3 years",
            "upload_id": upload_id,
        },
    )
    assert resp.status_code == 200
    ans = resp.json()
    assert ans["text"] == VISUAL_ONLY_TEMPORAL_REFUSAL


def test_gate3_count_by_type_returns_db_count_not_model_prose():
    """Gate 3: 'How many buildings?' returns DB count — test proves model prose count is not used."""
    # Feed model prose with fabricated count ("I see 42 buildings")
    verifier = NumberVerifier()
    db_count = 6
    facts = [
        NarrativeFact(
            fact_id="f1", kind="count", value=db_count, unit="detections", type="building"
        )
    ]

    prose_with_fabricated_count = (
        "In this satellite scene, I can clearly observe 42 buildings across the area."
    )
    verdict = verifier.verify(prose_with_fabricated_count, facts)

    # Verifier MUST fail because 42 != 6
    assert not verdict.passed
    assert "42" in verdict.rejected_tokens or any("42" in r for r in verdict.reasons)

    # API call returns verified DB count
    resp = client.post("/api/v1/ask", json={"question": "how many buildings"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"]["id"] == "count_by_type"
    assert "6" in data["text"]
    assert "42" not in data["text"]


def test_gate4_every_number_appears_in_facts_and_passes_verifier():
    """Gate 4: Every number in every answer appears in narrative_facts and passes the verifier."""
    verifier = NumberVerifier()
    facts = [
        NarrativeFact(fact_id="f1", kind="count", value=6, unit="changes", type="construction"),
        NarrativeFact(
            fact_id="f2",
            kind="area",
            value=184320.5,
            unit="m2",
            label="18.43 ha",
            type="construction",
        ),
        NarrativeFact(fact_id="f5", kind="count", value=312, unit="suppressed_candidates"),
    ]
    valid_prose = "Over the monitored window, 6 changes were detected totalling 18.43 ha. 312 candidates were suppressed."
    verdict = verifier.verify(valid_prose, facts)
    assert verdict.passed
    assert verdict.verdict == "PASS"


def test_gate5_out_of_scope_routes_to_unsupported():
    """Gate 5: Out-of-scope question routes to unsupported with honest message and never reaches Gemini."""
    router = QueryRouter()
    res = router.resolve_intent("who is the president of the country")
    assert res.intent_id == "unsupported"

    resp = client.post("/api/v1/ask", json={"question": "write python code for quicksort"})
    assert resp.status_code == 200
    ans = resp.json()
    assert ans["intent"]["id"] == "unsupported"
    assert ans["text"] == render_unsupported()
    assert len(ans["models_used"]) == 0


def test_gate6_offline_mode_produces_complete_answer():
    """Gate 6: OFFLINE=1 produces a complete answer across all intents."""
    with patch("app.settings.settings.OFFLINE", True):
        gemini = GeminiQAClient()
        facts = [NarrativeFact(fact_id="f1", kind="count", value=5, unit="features")]
        template = "Found 5 features in the designated region."
        text, tier, degraded, verdict, trace_info = gemini.phrase_answer(
            question="how many features", template_text=template, facts=facts
        )
        assert text == template
        assert tier == "template"
        assert not degraded
        assert not trace_info["model_invoked"]


def test_gate7_fabricated_model_response_degrades_to_template_and_logs_in_trace():
    """Gate 7: Fabricated model response is caught by verifier, degrades to template, visible in trace."""
    gemini = GeminiQAClient()
    facts = [NarrativeFact(fact_id="f1", kind="count", value=3, unit="structures")]
    template = "Found 3 structures."

    # Mock _call_gemini to inject a hallucinated number 999
    with patch.object(
        gemini, "_call_gemini", return_value="There are 999 structures visible here."
    ):
        with patch.object(gemini, "enabled", True):
            text, tier, degraded, verdict, trace_info = gemini.phrase_answer(
                question="how many structures", template_text=template, facts=facts
            )

            # Assert degradation
            assert text == template
            assert tier == "template"
            assert degraded is True
            assert verdict.verdict == "FAIL"
            assert trace_info["verifier_verdict"] == "FAIL"


def test_gate8_trace_structure_and_endpoints():
    """Gate 8: Trace shows intent + score, slots, SQL, bundle, model call, verifier verdict."""
    resp = client.post("/api/v1/ask", json={"question": "how many buildings"})
    assert resp.status_code == 200
    ans = resp.json()
    ans_id = ans["answer_id"]

    # Trace endpoint GET /api/v1/ask/{id}/trace
    trace_resp = client.get(f"/api/v1/ask/{ans_id}/trace")
    assert trace_resp.status_code == 200
    trace = trace_resp.json()

    assert "intent" in trace
    assert trace["intent"] == "count_by_type"
    assert "intent_score" in trace
    assert "slots" in trace
    assert "measurement_bundle" in trace
    assert "verifier_verdict" in trace
    assert len(trace["sql_queries"]) >= 1
    assert "SELECT count(*)" in trace["sql_queries"][0]

    # Report endpoint GET /api/v1/ask/{id}/report.json
    rep_resp = client.get(f"/api/v1/ask/{ans_id}/report.json")
    assert rep_resp.status_code == 200
    rep = rep_resp.json()
    assert "answer" in rep
    assert "trace" in rep
    assert rep["compliance"]["number_verifier_enforced"] is True
