"""Execution Trace data contract for Chakshu.

Fulfills SIH26167 explicit requirement for auditable execution history (B9).
Records intent, slots, executed queries, measurement bundle, raw model requests,
and verifier verdicts.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TraceRejection(BaseModel):
    """Specific rejection record with operational reason."""

    model_config = ConfigDict(extra="ignore")

    item: str
    reason: str
    detail: str | None = None


class Trace(BaseModel):
    """Complete execution trace for an AI response or analysis pipeline run."""

    model_config = ConfigDict(extra="ignore")

    trace_id: str
    timestamp: str
    intent: str
    intent_score: float
    slots: dict[str, Any] = Field(default_factory=dict)
    sql_queries: list[str] = Field(default_factory=list)
    measurement_bundle: dict[str, Any] = Field(default_factory=dict)
    tier_used: str
    model_request: dict[str, Any] | None = None
    model_response_raw: str | None = None
    verifier_verdict: str = Field(description="'PASS' | 'FAIL' | 'SKIPPED'")
    verifier_diff: dict[str, Any] | None = None
    rejections: list[TraceRejection] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
