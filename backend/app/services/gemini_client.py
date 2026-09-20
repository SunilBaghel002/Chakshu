"""Tier-2 Gemini Phrasing Client wrapped with Number Verifier (Tasks 6.5 & 6.6, PRD 2 §7).

Architectural Invariant:
THE AI NEVER PRODUCES A NUMBER.
Tier 2 only polishes grammar and flow. Every single output MUST pass the Number Verifier.
On any verifier failure, candidate prose is discarded, degraded mode is set, and the
deterministic Tier-1 template is returned.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

from app.schemas.summary import NarrativeFact
from app.services.verifier import NumberVerifier, VerifierVerdict
from app.settings import settings

log = logging.getLogger(__name__)

SYSTEM_PHRASING_INSTRUCTION = (
    "You are a factual satellite intelligence reporting assistant. "
    "Your ONLY task is to rephrase the provided measurement facts into clear, professional English. "
    "MANDATORY CONSTRAINTS:\n"
    "1. DO NOT add, remove, round, or alter ANY number, date, measurement, or unit.\n"
    "2. DO NOT introduce any place name, class name, or entity not in the measurement facts.\n"
    "3. Use only the exact facts provided in the prompt.\n"
    "4. Output only the final paragraph with zero conversational filler."
)


class GeminiQAClient:
    """Tier-2 phrasing client with strict verifier gating."""

    def __init__(
        self,
        verifier: NumberVerifier | None = None,
        api_key: str | None = None,
        model_name: str | None = None,
    ) -> None:
        self.verifier = verifier or NumberVerifier(tolerance_pct=0.02)
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = (model_name or settings.GEMINI_MODEL).removeprefix("models/")
        self.enabled = bool(settings.GEMINI_ENABLED and self.api_key and not settings.OFFLINE)

    def phrase_answer(
        self,
        question: str,
        template_text: str,
        facts: list[NarrativeFact],
    ) -> tuple[str, str, bool, VerifierVerdict, dict[str, Any]]:
        """Attempt Tier-2 natural phrasing with verifier verification.

        Returns:
            Tuple of:
            - final_text (str): polished prose if verified, else template_text
            - tier (str): "polished" if verified, else "template"
            - degraded (bool): True if candidate was rejected or offline fallback
            - verifier_verdict (VerifierVerdict): outcome from Number Verifier
            - trace_data (dict): logged model payload, response, and diff
        """
        trace_data: dict[str, Any] = {
            "model_invoked": False,
            "raw_response": None,
            "verifier_verdict": "SKIPPED",
            "verifier_diff": None,
        }

        # Offline / disabled path -> Tier 1 template immediately (§B8, §C3)
        if not self.enabled:
            verdict = self.verifier.verify(template_text, facts)
            trace_data["verifier_verdict"] = verdict.verdict
            return template_text, "template", False, verdict, trace_data

        # Build prompt from facts
        serialized_facts = [
            f"{f.kind} ({f.type or 'item'}): {f.value} {f.unit or ''}" for f in facts
        ]
        user_prompt = (
            f"User Question: {question}\n\n"
            f"Authorized Ground Truth Facts:\n" + "\n".join(serialized_facts) + "\n\n"
            f"Reference Factual Description:\n{template_text}"
        )

        trace_data["model_invoked"] = True
        trace_data["prompt"] = user_prompt

        candidate_prose = self._call_gemini(user_prompt)
        trace_data["raw_response"] = candidate_prose

        if not candidate_prose:
            verdict = self.verifier.verify(template_text, facts)
            trace_data["verifier_verdict"] = verdict.verdict
            return template_text, "template", True, verdict, trace_data

        # --- THE NUMBER VERIFIER GATE (Task 6.6) ---
        verdict = self.verifier.verify(candidate_prose, facts)
        trace_data["verifier_verdict"] = verdict.verdict
        trace_data["verifier_diff"] = verdict.diff

        if verdict.passed:
            log.info("Tier-2 phrasing PASSED Number Verifier check.")
            return candidate_prose, "polished", False, verdict, trace_data

        # Gate failure: DISCARD model prose, use template, mark degraded (§7)
        log.warning(
            "Tier-2 phrasing FAILED Number Verifier check. Reasons: %s. Degraded to template.",
            verdict.reasons,
        )
        return template_text, "template", True, verdict, trace_data

    def _call_gemini(self, prompt: str) -> str | None:
        """Call Gemini REST API for rephrasing."""
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PHRASING_INSTRUCTION}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 400},
        }
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            candidates = data.get("candidates", [])
            if not candidates:
                return None
            parts = candidates[0].get("content", {}).get("parts", [])
            return "".join(p.get("text", "") for p in parts).strip()
        except Exception as exc:
            log.warning("Gemini phrasing request error: %s", exc)
            return None
