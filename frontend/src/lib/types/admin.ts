/**
 * Data contracts and response types for Chakshu Admin Panel & Telemetry.
 * Specs: PRD 16 §1–§8 (D1–D8), PRD 14 §4, §6 (S4, S6)
 */

export interface AdminStatusResponse {
  admin_configured: boolean;
  role: string;
  session_label: string;
}

export interface KpiItem {
  value: string | number;
  delta: {
    text: string;
    n: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

export interface AdminOverviewResponse {
  range: string;
  kpis: {
    visitors: KpiItem;
    visits: KpiItem;
    median_dwell_s: KpiItem;
    operations_run: KpiItem;
    error_rate: KpiItem;
  };
  ops: {
    op: string;
    count: number;
    p50_ms: number;
    p95_ms: number;
    success_pct: number;
  }[];
  devices: { label: string; count: number }[];
  locations: { label: string; count: number }[];
  entry: { path: string; count: number }[];
  exit: { path: string; count: number }[];
  dropped_after_landing: {
    count: number;
    pct: number;
  };
  seeded: boolean;
  filtered_bots: number;
  query_ms: number;
  rows_scanned: number;
}

export interface SessionRow {
  id: string;
  session: string;
  first_seen: string;
  last_seen: string;
  visits: number;
  events: number;
  ops: string;
  device: string;
  location: string;
  entry: string;
  state: 'ACTIVE' | 'IDLE' | 'SIGNED UP';
  seeded: boolean;
}

export interface AdminSessionsResponse {
  items: SessionRow[];
  next_cursor: string | null;
  total: number;
  query_ms: number;
  rows_scanned: number;
}

export interface AdminSessionDetailResponse {
  header: {
    id: string;
    label: string;
    kind: 'user' | 'guest';
    first_seen: string;
  };
  measured: {
    events: number;
    visits: number;
    dwell: string;
    ops: number;
    errors: number;
  };
  device: {
    ua_raw: string;
    device: string;
    browser: string;
    os: string;
    screen: string;
    dpr: string;
    tz: string;
    ip_hash_prefix: string;
    ip_note: string;
    geo_city: string;
    geo_region: string;
    geo_country: string;
    referrer_host: string;
  };
  query_ms: number;
  rows_scanned: number;
}

export interface AdminTimelineEvent {
  name: string;
  family: string;
  time: string;
  iso_ts: string;
  path: string;
  salient: string;
  p: Record<string, unknown>;
  duration_ms?: number | null;
  ok?: boolean | null;
}

export interface AdminTimelineVisit {
  visit_id: string;
  title: string;
  started_at: string;
  ended_at: string;
  events: AdminTimelineEvent[];
}

export interface AdminSessionEventsResponse {
  visits: AdminTimelineVisit[];
  query_ms: number;
  rows_scanned: number;
}

export interface AdminSessionFilterParams {
  range?: string;
  device?: string;
  country?: string;
  op?: string;
  entry?: string;
  include_bots?: boolean;
  q?: string;
  cursor?: string;
  limit?: number;
}
