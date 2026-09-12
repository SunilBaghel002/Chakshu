/**
 * Multi-year ChangeSummary contracts for Chakshu.
 * Source: PRD 4 §5.
 */

import type { ChangeType } from './common';

export interface WindowSpec {
  from: string;
  to: string;
  years: number;
  from_source: string;
  to_source: string;
}

export interface SceneGap {
  start: string;
  end: string;
  days: number;
  reason: string;
  scenes_lost: number;
}

export interface SceneStats {
  total: number;
  usable: number;
  unusable: number;
  unusable_reasons: Record<string, number>;
  gaps: SceneGap[];
  median_interval_days: number;
}

export interface ChangeByTypeItem {
  change_type: ChangeType;
  count: number;
  net_area_m2: number;
  net_area_label: string;
  gross_gain_m2: number;
  gross_loss_m2: number;
  earliest_onset?: string | null;
  latest_onset?: string | null;
  still_active: number;
  note?: string | null;
}

export interface NarrativeFact {
  fact_id: string;
  kind: string;
  value: unknown;
  unit?: string | null;
  label?: string | null;
  type?: string | null;
  days?: number | null;
  reason?: string | null;
}

export interface ChangeSummary {
  summary_id: string;
  aoi_id: string;
  upload_id?: string | null;
  window: WindowSpec;
  scenes: SceneStats;
  by_type: ChangeByTypeItem[];
  change_object_ids: string[];
  suppression: Record<string, unknown>;
  narrative_facts: NarrativeFact[];
  answer?: Record<string, unknown> | null;
  trace_id: string;
  generated_at: string;
}
