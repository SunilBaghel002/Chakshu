/**
 * Detection and Upload data contracts for Chakshu.
 * Source: PRD 4 §4.
 */

import type {
  CapabilityTier,
  DetectionKind,
  DetectionTrack,
  GeoJsonGeometry,
  ProvenanceSource,
  UploadStatus,
} from './common';

export interface CapabilityPermissions {
  object_classes: string[];
  landcover_classes: string[];
  area_measurements: boolean;
  temporal_analysis: boolean;
}

export interface Upload {
  id: string;
  filename: string;
  title?: string | null;
  status: UploadStatus;
  width_px: number;
  height_px: number;
  band_count: number;
  bands: string[];
  bands_identified_by?: string | null;
  crs_epsg?: number | null;
  bounds_4326?: [number, number, number, number] | null;
  gsd_m?: number | null;
  gsd_source?: ProvenanceSource | null;
  acquired_at?: string | null;
  acquired_source?: ProvenanceSource | null;
  aoi_id?: string | null;
  aoi_name?: string | null;
  capability_tier: CapabilityTier;
  capabilities: CapabilityPermissions;
  capability_notice?: string | null;
  checksum_sha256: string;
  overview_url: string;
  created_at: string;
}

export interface Detection {
  id: string;
  track: DetectionTrack;
  label: string;
  label_raw?: string | null;
  kind: DetectionKind;
  geom_px: GeoJsonGeometry;
  geom_4326?: GeoJsonGeometry | null;
  area_px: number;
  area_m2?: number | null;
  area_label?: string | null;
  score: number;
  score_source: string;
  verified: boolean;
  verifier_note?: string | null;
}

export interface CoverageClassItem {
  label: string;
  px: number;
  pct: number;
  area_m2?: number | null;
}

export interface CoverageSummary {
  source_track: DetectionTrack;
  total_px: number;
  by_class: CoverageClassItem[];
  sum_check_pct: number;
}

export interface CountsSummary {
  by_label: Record<string, number>;
  total_object_detections: number;
  total_landcover_detections: number;
  source: string;
}

export interface RejectionDetail {
  label_raw: string;
  reason: string;
  detail: string;
}

export interface RejectionsSummary {
  count: number;
  by_reason: Record<string, number>;
  detail: RejectionDetail[];
}

export interface LandcoverClassStats {
  pct: number;
  m2: number | null;
  ha: number | null;
}

export interface DetectionStats {
  total_objects: number;
  objects_by_class: Record<string, number>;
  total_area_m2: number | null;
  landcover_area: Record<string, LandcoverClassStats>;
}

export interface DetectionSet {
  upload: Upload;
  detections: Detection[];
  coverage?: CoverageSummary | null;
  counts: CountsSummary;
  rejections: RejectionsSummary;
  stats?: DetectionStats | null;
  job_id?: string | null;
  trace_id?: string | null;
  annotated_url?: string | null;
  explanation?: string | null;
  status?: string | null;
  error?: string | null;
  artifact_version?: string | null;
  track_status?: Record<string, string>;
}
