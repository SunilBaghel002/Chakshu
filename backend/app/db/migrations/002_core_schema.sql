-- 002_core_schema.sql
-- Core relational, spatial, and vector schema for Chakshu

-- ── Areas of interest ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aoi (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  geom          geometry(Polygon, 4326) NOT NULL,
  utm_epsg      integer NOT NULL,          -- measurement CRS, derived once
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Archive scenes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scene (
  id              text PRIMARY KEY,        -- e.g. S2B_43RCU_20240609_0_L2A
  aoi_id          uuid NOT NULL REFERENCES aoi(id),
  acquired_at     date NOT NULL,
  cloud_cover_pct numeric(5,2) NOT NULL,
  usable          boolean NOT NULL,        -- false if cloud/shadow too high
  unusable_reason text,
  cog_path        text NOT NULL,
  checksum_sha256 text NOT NULL,           -- provenance
  sensor          text NOT NULL DEFAULT 'sentinel-2-l2a',
  gsd_m           numeric(6,2) NOT NULL DEFAULT 10.0,
  UNIQUE (aoi_id, acquired_at, sensor)
);
CREATE INDEX IF NOT EXISTS idx_scene_aoi_acquired ON scene (aoi_id, acquired_at DESC);
CREATE INDEX IF NOT EXISTS idx_scene_usable ON scene (aoi_id) WHERE usable;

-- ── Tiles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tile (
  id           bigserial PRIMARY KEY,
  scene_id     text NOT NULL REFERENCES scene(id) ON DELETE CASCADE,
  x            integer NOT NULL,
  y            integer NOT NULL,
  geom         geometry(Polygon, 4326) NOT NULL,
  cloud_pct    numeric(5,2) NOT NULL,
  ndvi_mean    numeric(6,3),
  ndwi_mean    numeric(6,3),
  ndbi_mean    numeric(6,3),
  vector       vector(512),               -- CLIP embedding
  UNIQUE (scene_id, x, y)
);
CREATE INDEX IF NOT EXISTS idx_tile_vector_hnsw ON tile USING hnsw (vector vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_tile_geom_gist ON tile USING gist (geom);

-- ── Change objects: polygons merged across time into entities ──────
CREATE TABLE IF NOT EXISTS change_object (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aoi_id           uuid NOT NULL REFERENCES aoi(id),
  change_type      text NOT NULL,           -- enum: construction, demolition, clearance, etc.
  rule_trace       jsonb NOT NULL,          -- which rules fired, with values
  first_supported  date,                    -- onset, may be null
  onset_interval   daterange,               -- the honest uncertainty window
  onset_gaps       jsonb NOT NULL DEFAULT '[]',
  area_m2          numeric(14,2) NOT NULL,  -- MEASURED, latest observation
  area_series      jsonb NOT NULL DEFAULT '[]',
  centroid         geometry(Point, 4326) NOT NULL,
  geom             geometry(Polygon, 4326) NOT NULL,
  confidence       numeric(4,3) NOT NULL,
  confidence_parts jsonb NOT NULL,          -- the five components
  status           text NOT NULL DEFAULT 'pending',  -- pending|confirmed|rejected
  analyst_note     text,
  decided_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_change_object_geom_gist ON change_object USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_change_object_lookup ON change_object (aoi_id, change_type, status);

-- ── Detections on uploaded images ──────────────────────────────────
CREATE TABLE IF NOT EXISTS upload (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename        text NOT NULL,
  stored_path     text NOT NULL,
  checksum_sha256 text NOT NULL,
  width_px        integer NOT NULL,
  height_px       integer NOT NULL,
  band_count      integer NOT NULL,
  bands           text[] NOT NULL,           -- ['red','green','blue','nir','swir16']
  crs_epsg        integer,                   -- null if ungeoreferenced
  bounds_4326     geometry(Polygon, 4326),   -- null if ungeoreferenced
  gsd_m           numeric(8,3),              -- null if unknown
  gsd_source      text,                      -- 'metadata'|'user_declared'|'assumed'
  acquired_at     date,
  acquired_source text,                      -- 'metadata'|'user_declared'|null
  aoi_id          uuid REFERENCES aoi(id),   -- null if not matched
  status          text NOT NULL,             -- GEOREFERENCED|VISUAL_ONLY|REJECTED
  capability_tier text NOT NULL,            -- T1_VERY_HIGH, T2_HIGH, T3_MEDIUM, T4_COARSE, T0_UNKNOWN
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS detection (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id     uuid NOT NULL REFERENCES upload(id) ON DELETE CASCADE,
  track         text NOT NULL,              -- 'object_model'|'landcover_index'|'landcover_worldcover'
  label         text NOT NULL,              -- canonical class name
  label_raw     text,                       -- what the model actually said
  kind          text NOT NULL,              -- 'box'|'polygon'
  geom_px       geometry(Polygon) NOT NULL, -- PIXEL coordinates, y down
  geom_4326     geometry(Polygon, 4326),    -- null if ungeoreferenced
  area_px       numeric(14,2) NOT NULL,
  area_m2       numeric(14,2),              -- null unless GSD is trusted
  score         numeric(4,3) NOT NULL,
  score_source  text NOT NULL,              -- 'model'|'deterministic'|'agreement'
  verified      boolean NOT NULL DEFAULT false,
  verifier_note text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_detection_lookup ON detection (upload_id, track, label);

-- ── Decisions & audit ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decision (
  id          bigserial PRIMARY KEY,
  actor       text NOT NULL DEFAULT 'analyst',
  entity_type text NOT NULL,   -- 'change_object'|'detection'|'answer'
  entity_id   text NOT NULL,
  action      text NOT NULL,   -- 'confirm'|'reject'|'ask'|'export'
  note        text,
  payload     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  seq         bigserial PRIMARY KEY,
  prev_hash   text NOT NULL,
  entry_hash  text NOT NULL,
  decision_id bigint REFERENCES decision(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  content     jsonb NOT NULL
);
