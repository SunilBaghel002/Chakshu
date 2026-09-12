/**
 * Common enums, geometry, and error contracts for Chakshu.
 * Source: PRD 4 §1, §2, §8.
 */

export type ChangeType =
  | 'construction'
  | 'demolition'
  | 'clearance'
  | 'vegetation_gain'
  | 'water_gain'
  | 'water_loss'
  | 'road'
  | 'expansion'
  | 'contraction'
  | 'other';

export type DetectionTrack =
  | 'object_model'
  | 'landcover_index'
  | 'landcover_worldcover';

export type DetectionKind = 'box' | 'polygon';

export type ObjectClass =
  | 'building'
  | 'building_cluster'
  | 'vehicle'
  | 'aircraft'
  | 'ship'
  | 'ship_large'
  | 'storage_tank'
  | 'swimming_pool'
  | 'tower'
  | 'container'
  | 'road';

export type LandCoverClass =
  | 'built'
  | 'water'
  | 'vegetation'
  | 'bare'
  | 'crop'
  | 'snow'
  | 'unclassified';

export type CapabilityTier =
  | 'T1_VERY_HIGH'
  | 'T2_HIGH'
  | 'T3_MEDIUM'
  | 'T4_COARSE'
  | 'T0_UNKNOWN';

export type UploadStatus = 'GEOREFERENCED' | 'VISUAL_ONLY' | 'REJECTED';

export type ProvenanceSource = 'metadata' | 'user_declared' | 'assumed' | 'derived';

export type SuppressionReason =
  | 'min_size'
  | 'cloud'
  | 'cloud_shadow'
  | 'registration'
  | 'seasonal'
  | 'illumination'
  | 'snow_cover'
  | 'low_confidence';

export type DecisionStatus = 'pending' | 'confirmed' | 'rejected';

export type AnswerTier = 'template' | 'polished' | 'degraded';

export type JobState = 'queued' | 'running' | 'succeeded' | 'failed';

export type ValueKind = 'MEASURED' | 'INFERRED';

export interface GeoJsonGeometry {
  type: string;
  coordinates: number[][][] | number[][][][];
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
    trace_id: string;
  };
}
