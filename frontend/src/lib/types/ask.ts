/**
 * Answer, Question Answering, and Trace contracts for Chakshu.
 * Source: PRD 4 §6 and PRD 2 §8.
 */

import type { AnswerTier } from './common';

export interface IntentMatch {
  id: string;
  score: number;
  matched_by: string;
}

export interface AnswerHighlights {
  change_object_ids: string[];
  detection_ids: string[];
  focus_bbox_4326?: [number, number, number, number] | null;
}

export interface AnswerSource {
  kind: string;
  id: string;
  checksum?: string | null;
  licence?: string | null;
}

export interface Answer {
  answer_id: string;
  question: string;
  question_normalised: string;
  intent: IntentMatch;
  slots: Record<string, unknown>;
  tier: AnswerTier;
  degraded: boolean;
  text: string;
  text_template: string;
  confidence: number;
  confidence_parts: Record<string, number>;
  measurements: {
    bundle_id: string;
    facts: unknown[];
  };
  highlights: AnswerHighlights;
  sources: AnswerSource[];
  models_used: Array<Record<string, unknown>>;
  capability_notice?: string | null;
  trace_url: string;
  report_url: string;
  generated_at: string;
}

export interface TraceRejection {
  item: string;
  reason: string;
  detail?: string | null;
}

export interface Trace {
  trace_id: string;
  timestamp: string;
  intent: string;
  intent_score: number;
  slots: Record<string, unknown>;
  sql_queries: string[];
  measurement_bundle: Record<string, unknown>;
  tier_used: string;
  model_request?: Record<string, unknown> | null;
  model_response_raw?: string | null;
  verifier_verdict: string;
  verifier_diff?: Record<string, unknown> | null;
  rejections: TraceRejection[];
  warnings: string[];
}
