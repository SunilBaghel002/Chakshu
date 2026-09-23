/**
 * TypeScript Data Contracts for Evidence-Grounded Satellite Analysis (SIH26167).
 */

export type AnalysisTask =
  | 'scene_understanding'
  | 'building_detection'
  | 'water_segmentation'
  | 'vegetation_segmentation'
  | 'landcover_classification'
  | 'change_detection'
  | 'refusal_resolution'
  | 'unsupported';

export interface EvidenceObject {
  evidence_id: string;
  task: string;
  class_label: string;
  confidence: number;
  mask_available: boolean;
  polygon_available: boolean;
  bbox_available: boolean;
  geometry_source: string;
  pixel_area: number;
  physical_area_m2?: number | null;
  physical_area_ha?: number | null;
  coordinate_space: string;
  geom_px?: {
    type: 'Polygon';
    coordinates: number[][][];
    polygon_px?: number[][];
    area_px?: number;
    bbox_px?: number[];
  } | null;
  bbox_px?: [number, number, number, number] | null; // [ymin, xmin, ymax, xmax]
  validation: {
    geometry_valid?: boolean;
    mask_overlap_iou?: number | null;
    vertex_count?: number;
    closed_ring?: boolean;
    no_self_intersection?: boolean;
    [key: string]: unknown;
  };
  note?: string | null;
}

export interface OverlayCollection {
  masks: Array<Record<string, unknown>>;
  polygons: Array<Record<string, unknown>>;
  boxes: Array<{ bbox_px?: number[]; label?: string; score?: number }>;
  changes: Array<Record<string, unknown>>;
  mask_url?: string | null;
}

export interface ImageMetadata {
  image_width: number;
  image_height: number;
  gsd_m?: number | null;
  gsd_source?: string | null;
  modality: string;
  coordinate_system: string;
  is_georeferenced: boolean;
  bounds_4326?: number[] | null;
  band_count: number;
}

export interface AnalysisResponse {
  task: AnalysisTask;
  execution_mode: 'deterministic' | 'hybrid' | 'pure_model';
  image_metadata: ImageMetadata;
  evidence_objects: EvidenceObject[];
  overlays: OverlayCollection;
  verifier_result?: Record<string, unknown>;
  report_url?: string;
  trace_id: string;
}

export interface SemanticSearchResultItem {
  tile_id: string;
  scene_id: string;
  x: number;
  y: number;
  geom?: Record<string, unknown>;
  cloud_pct?: number;
  ndvi_mean?: number;
  ndwi_mean?: number;
  ndbi_mean?: number;
  score: number;
  png_url?: string;
  acquired_at?: string;
}

export interface SemanticSearchResponse {
  query: string;
  count: number;
  results: SemanticSearchResultItem[];
}
