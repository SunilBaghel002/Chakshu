/**
 * Area of Interest (AOI), Scene, and Job TypeScript types.
 * Source: PRD 2 §4, PRD 4 §4, §6.
 */

export interface AoiCreate {
  name: string;
  geom: Record<string, unknown>;
  utm_epsg?: number;
}

export interface Aoi {
  id: string;
  name: string;
  geom: Record<string, unknown>;
  utm_epsg: number;
  created_at: string;
}

export interface AoiListResponse {
  items: Aoi[];
  total: number;
}

export interface Scene {
  id: string;
  aoi_id: string;
  acquired_at: string;
  cloud_cover_pct: number;
  usable: boolean;
  unusable_reason: string | null;
  cog_path: string;
  checksum_sha256: string;
  sensor: string;
  gsd_m: number;
}

export interface SceneListResponse {
  items: Scene[];
  total: number;
}

export interface JobResponse {
  job_id: string;
  state: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  result?: Record<string, unknown> | null;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    trace_id?: string;
  } | null;
}

export interface JobListResponse {
  items: JobResponse[];
  total: number;
}
