/**
 * Evidence data contracts for Chakshu.
 * Source: PRD 4 §3.
 */

import type { ChangeType, DecisionStatus, GeoJsonGeometry } from './common';

export interface MeasurementSubObject {
  area_m2: number;
  area_label: string;
  perimeter_m: number;
  centroid: [number, number];
  bbox_4326: [number, number, number, number];
  utm_epsg: number;
  geom_4326: GeoJsonGeometry;
  measured_by: string;
  kind: 'MEASURED';
}

export interface RuleTraceItem {
  rule: string;
  field?: string;
  value?: unknown;
  tested_value?: unknown;
  threshold?: unknown;
  expected?: unknown;
  comparator?: string;
  passed?: boolean;
  fired?: boolean;
  rationale?: string;
}

export interface ClassificationAlternative {
  change_type?: ChangeType;
  type?: string;
  score: number;
  reason?: string;
  rationale?: string;
}

export interface ClassificationSubObject {
  change_type: ChangeType;
  rule_trace: RuleTraceItem[];
  alternatives: ClassificationAlternative[];
  kind: 'INFERRED';
}

export interface OnsetInterval {
  start: string;
  end: string;
  days: number;
}

export interface OnsetGap {
  start: string;
  end: string;
  reason: string;
  scenes_lost?: number;
}

export interface AreaSeriesPoint {
  date: string;
  area_m2: number;
}

export interface TemporalSubObject {
  first_supported?: string | null;
  last_seen?: string | null;
  onset_interval?: OnsetInterval | null;
  onset_gaps: OnsetGap[];
  persistence_k: number;
  area_series: AreaSeriesPoint[];
  trend?: string | null;
  kind: 'MEASURED';
}

export interface ConfidenceParts {
  detector_agreement: number;
  image_quality: number;
  registration: number;
  classification_margin: number;
  temporal_persistence: number;
}

export interface ConfidenceSubObject {
  overall: number;
  parts: ConfidenceParts;
  method: string;
  calibrated: boolean;
  calibration_ece?: number | null;
  calibration_n?: number | null;
  kind: 'INFERRED';
}

export interface SuppressionContextSubObject {
  candidates_generated: number;
  candidates_suppressed: number;
  candidates_retained: number;
  by_reason: Record<string, number>;
}

export interface SceneSource {
  scene_id: string;
  acquired_at: string;
  checksum_sha256: string;
  cloud_cover_pct: number;
  sensor: string;
}

export interface SourcesSubObject {
  before: SceneSource;
  after: SceneSource;
  mask_path: string;
  triptych_urls: {
    before: string;
    mask: string;
    after: string;
  };
}

export interface ModelUsed {
  name: string;
  version: string;
  role: string;
  licence: string;
  source?: string | null;
  enabled: boolean;
}

export interface ProcessingStep {
  step: number;
  op: string;
  detail: string;
}

export interface AnalystDecision {
  note?: string | null;
  decided_at?: string | null;
  actor?: string | null;
}

export interface Evidence {
  change_object_id: string;
  aoi_id: string;
  change_type: ChangeType;
  status: DecisionStatus;
  measurement: MeasurementSubObject;
  classification: ClassificationSubObject;
  temporal: TemporalSubObject;
  confidence: ConfidenceSubObject;
  suppression_context: SuppressionContextSubObject;
  sources: SourcesSubObject;
  models_used: ModelUsed[];
  processing_history: ProcessingStep[];
  analyst: AnalystDecision;
}
