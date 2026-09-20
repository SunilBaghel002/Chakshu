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
    [key: string]: any;
  };
  note?: string | null;
}

export interface OverlayCollection {
  masks: Array<Record<string, any>>;
  polygons: Array<Record<string, any>>;
  boxes: Array<{ bbox_px?: number[]; label?: string; score?: number }>;
  changes: Array<Record<string, any>>;
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
  query: string;
  task: AnalysisTask;
  target?: string | null;
  answer: string;
  evidence: EvidenceObject[];
  overlays: OverlayCollection;
  metadata: ImageMetadata;
  warnings: string[];
  status: 'completed' | 'insufficient_evidence' | 'refused' | 'error';
  execution_time_ms?: number | null;
}
