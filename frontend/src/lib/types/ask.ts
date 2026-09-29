/**
 * Answer, Question Answering, and Trace contracts for Chakshu.
 * Source: PRD 4 §6 and PRD 2 §8, SIH26167.
 */

import type { AnswerTier } from './common';

export interface IntentMatch {
  id: string;
  score: number;
  matched_by: string;
}

export interface MapActionItem {
  action: string;
  evidence_ids: string[];
  params?: Record<string, unknown>;
}

export interface AnnotationIntent {
  intent: string;
  target: string;
  operation: string;
  operations?: string[];
  scope?: string;
  temporal_scope?: string | null;
  temporal_range?: string[] | null;
  filter?: Record<string, unknown> | null;
  label_mode?: string;
  measurement?: string | null;
  evidence_required?: boolean;
  color_override?: string | null;
}

export interface AnswerHighlights {
  change_object_ids: string[];
  detection_ids: string[];
  focus_bbox_4326?: [number, number, number, number] | null;
  map_action?: string | null;
  evidence_titles?: string[];
  map_actions?: MapActionItem[];
  annotation_labels?: Record<string, string>;
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
    facts: Array<Record<string, unknown>>;
  };
  highlights: AnswerHighlights;
  sources: AnswerSource[];
  models_used: Array<Record<string, unknown>>;
  capability_notice?: string | null;
  trace_url: string;
  report_url: string;
  generated_at: string;
  temporal?: { date_a?: string; date_b?: string };
  follow_ups?: string[];
  annotation_intent?: AnnotationIntent | null;
  evidence_ids?: string[];
  map_actions?: MapActionItem[];
}

export interface AskAnswerData {
  query: string;
  answerText: string;
  epistemicTier: 'MEASURED' | 'INFERRED' | 'UNVERIFIED' | 'REFUSAL';
  confidence: number;
  measuredNumbers?: { label: string; value: string; source: string }[];
  sources?: string[];
  traceId?: string;
  temporal?: { date_a?: string; date_b?: string };
  changeObjectIds?: string[];
  focusBbox?: number[];
  mapAction?: string;
  mapActions?: MapActionItem[];
  annotationLabels?: Record<string, string>;
  annotationIntent?: AnnotationIntent | null;
  followUps?: string[];
  evidenceTitles?: string[];
  primaryStat?: string;
  targetTitle?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: string;
  text: string;
  intent?: string;
  targetClass?: string;
  answerData?: AskAnswerData;
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
