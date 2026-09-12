"""Execution Trace recorder service for Chakshu.

Fulfills SIH26167 explicit requirement for auditable execution history (B9).
Records intent, slots, executed queries, measurement bundle, raw model requests,
and verifier verdicts.
"""

from __future__ import annotations

import datetime
from typing import Any

from app.schemas.trace import Trace, TraceRejection


class TraceRecorder:
    """Builder for constructing an auditable execution trace."""

    def __init__(
        self, trace_id: str, intent: str = "unassigned", intent_score: float = 0.0
    ) -> None:
        """Initialize recorder with a unique trace identifier."""
        self.trace_id = trace_id
        self.timestamp = datetime.datetime.now(datetime.UTC).isoformat()
        self.intent = intent
        self.intent_score = intent_score
        self.slots: dict[str, Any] = {}
        self.sql_queries: list[str] = []
        self.measurement_bundle: dict[str, Any] = {}
        self.tier_used: str = "template"
        self.model_request: dict[str, Any] | None = None
        self.model_response_raw: str | None = None
        self.verifier_verdict: str = "SKIPPED"
        self.verifier_diff: dict[str, Any] | None = None
        self.rejections: list[TraceRejection] = []
        self.warnings: list[str] = []

    def set_intent(self, intent: str, score: float) -> TraceRecorder:
        """Record matched intent and confidence score."""
        self.intent = intent
        self.intent_score = score
        return self

    def add_slot(self, key: str, value: Any) -> TraceRecorder:
        """Record an extracted slot value."""
        self.slots[key] = value
        return self

    def add_sql_query(self, query: str) -> TraceRecorder:
        """Log an executed deterministic SQL query."""
        self.sql_queries.append(query.strip())
        return self

    def set_measurement_bundle(self, bundle: dict[str, Any]) -> TraceRecorder:
        """Attach deterministic measurement facts bundle."""
        self.measurement_bundle = bundle
        return self

    def record_tier_used(self, tier: str) -> TraceRecorder:
        """Record answering tier (template, polished, degraded)."""
        self.tier_used = tier
        return self

    def record_model_call(
        self, request_payload: dict[str, Any], raw_response: str | None
    ) -> TraceRecorder:
        """Log verbatim model inputs and outputs."""
        self.model_request = request_payload
        self.model_response_raw = raw_response
        return self

    def record_verifier(self, verdict: str, diff: dict[str, Any] | None = None) -> TraceRecorder:
        """Record Number Verifier verdict and diff."""
        self.verifier_verdict = verdict
        self.verifier_diff = diff
        return self

    def add_rejection(self, item: str, reason: str, detail: str | None = None) -> TraceRecorder:
        """Record a rejected candidate box, polygon, or capability request."""
        self.rejections.append(TraceRejection(item=item, reason=reason, detail=detail))
        return self

    def add_warning(self, warning: str) -> TraceRecorder:
        """Record a non-fatal warning or degradation notification."""
        self.warnings.append(warning)
        return self

    def build(self) -> Trace:
        """Construct the immutable Trace contract."""
        return Trace(
            trace_id=self.trace_id,
            timestamp=self.timestamp,
            intent=self.intent,
            intent_score=self.intent_score,
            slots=self.slots,
            sql_queries=self.sql_queries,
            measurement_bundle=self.measurement_bundle,
            tier_used=self.tier_used,
            model_request=self.model_request,
            model_response_raw=self.model_response_raw,
            verifier_verdict=self.verifier_verdict,
            verifier_diff=self.verifier_diff,
            rejections=self.rejections,
            warnings=self.warnings,
        )
