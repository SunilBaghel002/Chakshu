# PRD 4 — Data Contracts

> **Audience:** Claude Code and human developers.
> **Status:** Authoritative and **frozen once Phase 1 starts.** Changing a contract here requires editing this file first, regenerating frontend types, and updating golden tests — in that order.
> **Depends on:** `architecture.md`

**Why this file exists:** the number one cause of a lost integration day is frontend and backend disagreeing about a JSON shape. This file is the single source of truth. Backend Pydantic models and frontend TypeScript types are both generated from / validated against it.

---

## 1. Conventions

- **IDs:** UUID v4 as strings, except `scene.id` (the satellite product name) and `tile.id` (bigint, exposed as a string in JSON to avoid JS precision loss).
- **Dates:** ISO 8601. `date` = `YYYY-MM-DD`. Timestamps = RFC 3339 with `Z` or explicit offset, always UTC on the wire.
- **Numbers:** JSON numbers. `null` when genuinely unknown — **never `0`, `-1`, `NaN`, or `""` as a sentinel.** A missing area and a zero area are different facts.
- **Areas:** always `m²` in the field named `*_m2`. Human-readable strings (`"18.4 ha"`) are provided separately as `*_label` and are **display-only** — never parse them.
- **Coordinates:** GeoJSON order `[lon, lat]` = `[x, y]`, WGS84 (EPSG:4326), unless the field says otherwise.
- **Pixel coordinates:** `[x, y]` with origin at the **top-left**, y increasing downward. Stated on every pixel-space field as `_px`.
- **Bounding boxes from Gemini:** see §7 — a specific, verified convention. Do not guess.
- **Polygons:** GeoJSON geometry objects.
- **Enums:** lowercase `snake_case` strings. Adding a value requires updating this file, the DB check constraint, and the frontend union type.
- **Naming:** `snake_case` everywhere, including JSON keys. No `camelCase` on the wire.
- **Versioning:** all routes under `/api/v1/`.

---

## 2. Enums

```python
class ChangeType(str, Enum):
    CONSTRUCTION = "construction"  # new built structure
    DEMOLITION = "demolition"  # built structure removed
    CLEARANCE = "clearance"  # vegetation removed
    VEGETATION_GAIN = "vegetation_gain"  # afforestation, regrowth, new crop
    WATER_GAIN = "water_gain"  # inundation, reservoir filling
    WATER_LOSS = "water_loss"  # drying, recession
    ROAD = "road"  # new linear transport feature
    EXPANSION = "expansion"  # existing object grew
    CONTRACTION = "contraction"  # existing object shrank
    OTHER = "other"  # real change, type not determinable


class DetectionTrack(str, Enum):
    OBJECT_MODEL = "object_model"
    LANDCOVER_INDEX = "landcover_index"
    LANDCOVER_WORLDCOVER = "landcover_worldcover"


class DetectionKind(str, Enum):
    BOX = "box"
    POLYGON = "polygon"


class ObjectClass(str, Enum):
    BUILDING = "building"
    BUILDING_CLUSTER = "building_cluster"
    VEHICLE = "vehicle"
    AIRCRAFT = "aircraft"
    SHIP = "ship"
    SHIP_LARGE = "ship_large"
    STORAGE_TANK = "storage_tank"
    SWIMMING_POOL = "swimming_pool"
    TOWER = "tower"
    CONTAINER = "container"
    ROAD = "road"


class LandCoverClass(str, Enum):
    BUILT = "built"
    WATER = "water"
    VEGETATION = "vegetation"
    BARE = "bare"
    CROP = "crop"
    SNOW = "snow"
    UNCLASSIFIED = "unclassified"


class CapabilityTier(str, Enum):
    T1_VERY_HIGH = "T1_VERY_HIGH"  # <= 1 m
    T2_HIGH = "T2_HIGH"  # <= 5 m
    T3_MEDIUM = "T3_MEDIUM"  # <= 15 m  (Sentinel-2)
    T4_COARSE = "T4_COARSE"  # > 15 m
    T0_UNKNOWN = "T0_UNKNOWN"  # no trustworthy GSD


class UploadStatus(str, Enum):
    GEOREFERENCED = "GEOREFERENCED"
    VISUAL_ONLY = "VISUAL_ONLY"
    REJECTED = "REJECTED"


class ProvenanceSource(str, Enum):
    METADATA = "metadata"
    USER_DECLARED = "user_declared"
    ASSUMED = "assumed"
    DERIVED = "derived"


class SuppressionReason(str, Enum):
    MIN_SIZE = "min_size"
    CLOUD = "cloud"
    CLOUD_SHADOW = "cloud_shadow"
    REGISTRATION = "registration"
    SEASONAL = "seasonal"
    ILLUMINATION = "illumination"
    SNOW_COVER = "snow_cover"
    LOW_CONFIDENCE = "low_confidence"


class DecisionStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class AnswerTier(str, Enum):
    TEMPLATE = "template"  # Tier 1 only
    POLISHED = "polished"  # Tier 2, verifier PASS
    DEGRADED = "degraded"  # Tier 2 attempted, verifier FAIL, fell back


class JobState(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
```

---

## 3. The `Evidence` object

Attached to every change. This is the core artefact of the whole system and the direct answer to SIH26227 §2.2.5.

```json
{
  "change_object_id": "8f2c1a4e-...",
  "aoi_id": "b1d3...",
  "change_type": "construction",
  "status": "pending",

  "measurement": {
    "area_m2": 18432.5,
    "area_label": "1.84 ha",
    "perimeter_m": 561.2,
    "centroid": [77.7612, 28.1305],
    "bbox_4326": [77.7580, 28.1281, 77.7649, 28.1330],
    "utm_epsg": 32643,
    "geom_4326": { "type": "Polygon", "coordinates": [[[...]]] },
    "measured_by": "ST_Area on vectorised mask, UTM 43N",
    "kind": "MEASURED"
  },

  "classification": {
    "change_type": "construction",
    "rule_trace": [
      {"rule": "d_ndbi_rise",   "field": "d_ndbi", "value": 0.21, "threshold": 0.10, "fired": true},
      {"rule": "d_ndvi_fall",   "field": "d_ndvi", "value": -0.34, "threshold": -0.15, "fired": true},
      {"rule": "prior_landcover","field": "worldcover_2021", "value": "crop", "expected": ["crop","bare","vegetation"], "fired": true},
      {"rule": "not_water",     "field": "d_ndwi", "value": -0.02, "threshold": 0.15, "fired": true}
    ],
    "alternatives": [
      {"change_type": "clearance", "score": 0.31, "reason": "d_ndvi also fell, but d_ndbi rise dominates"}
    ],
    "kind": "INFERRED"
  },

  "temporal": {
    "first_supported": "2024-06-09",
    "last_seen": "2026-08-03",
    "onset_interval": {"start": "2024-01-18", "end": "2024-06-09", "days": 143},
    "onset_gaps": [{"start": "2024-06-01", "end": "2024-09-30", "reason": "monsoon cloud, 4 scenes unusable"}],
    "persistence_k": 3,
    "area_series": [
      {"date": "2024-06-09", "area_m2": 4210.0},
      {"date": "2024-11-02", "area_m2": 11800.0},
      {"date": "2025-06-14", "area_m2": 17950.0},
      {"date": "2026-08-03", "area_m2": 18432.5}
    ],
    "trend": "expanding",
    "kind": "MEASURED"
  },

  "confidence": {
    "overall": 0.86,
    "parts": {
      "detector_agreement": 0.90,
      "image_quality":      0.82,
      "registration":       0.95,
      "classification_margin": 0.78,
      "temporal_persistence":  0.88
    },
    "method": "geometric_mean",
    "calibrated": true,
    "calibration_ece": 0.043,
    "calibration_n": 147,
    "kind": "INFERRED"
  },

  "suppression_context": {
    "candidates_generated": 318,
    "candidates_suppressed": 312,
    "candidates_retained": 6,
    "by_reason": {
      "seasonal": 188, "cloud_shadow": 94, "registration": 30,
      "min_size": 0, "cloud": 0, "illumination": 0, "snow_cover": 0, "low_confidence": 0
    }
  },

  "sources": {
    "before": {"scene_id": "S2A_43RCU_20240118_0_L2A", "acquired_at": "2024-01-18",
               "checksum_sha256": "a3f1...", "cloud_cover_pct": 4.2, "sensor": "sentinel-2-l2a"},
    "after":  {"scene_id": "S2B_43RCU_20240609_0_L2A", "acquired_at": "2024-06-09",
               "checksum_sha256": "9c2e...", "cloud_cover_pct": 2.8, "sensor": "sentinel-2-l2a"},
    "mask_path": "data/masks/8f2c1a4e.png",
    "triptych_urls": {
      "before": "/api/v1/tiles/evidence/8f2c1a4e/before.png",
      "mask":   "/api/v1/tiles/evidence/8f2c1a4e/mask.png",
      "after":  "/api/v1/tiles/evidence/8f2c1a4e/after.png"
    }
  },

  "models_used": [
    {"name": "index-cva-otsu", "version": "1.0.0", "role": "primary_detector", "licence": "internal"},
    {"name": "TinyCD", "version": "b1", "role": "corroborating_detector",
     "licence": "MIT", "source": "AndreaCodegoni/Tiny_model_4_CD", "enabled": false},
    {"name": "ESA WorldCover", "version": "2021 v200", "role": "landcover_prior", "licence": "CC-BY-4.0"}
  ],

  "processing_history": [
    {"step": 1, "op": "reproject", "detail": "EPSG:32643, bilinear"},
    {"step": 2, "op": "cloud_mask", "detail": "SCL classes 3,8,9,11 excluded"},
    {"step": 3, "op": "register", "detail": "phase correlation, shift 0.3 px, within tolerance"},
    {"step": 4, "op": "indices", "detail": "NDVI, NDWI, NDBI computed"},
    {"step": 5, "op": "detect", "detail": "index-CVA + Otsu threshold 0.184"},
    {"step": 6, "op": "morphology", "detail": "open 3x3, min area 4 px"},
    {"step": 7, "op": "vectorise", "detail": "rasterio.features.shapes"},
    {"step": 8, "op": "classify", "detail": "rule table v1"},
    {"step": 9, "op": "suppress", "detail": "8 gates, 312 of 318 discarded"},
    {"step":10, "op": "measure", "detail": "ST_Area UTM 43N"},
    {"step":11, "op": "onset", "detail": "forward walk, k=3"},
    {"step":12, "op": "confidence", "detail": "geometric mean of 5 components"}
  ],

  "analyst": {"note": null, "decided_at": null, "actor": null}
}
```

### The `kind` field is mandatory on every sub-object

`MEASURED` = produced by deterministic geometry/arithmetic over pixels.
`INFERRED` = produced by a model or a rule table that could be wrong.

The frontend renders `MEASURED` with a solid green chip and `INFERRED` with an outlined amber chip. **This is not decoration.** It is the visual form of the project's central promise, and SIH26227 §2.2.3 asks for it directly.

---

## 4. The `Upload` and `DetectionSet` objects

```json
{
  "upload": {
    "id": "c4a9...",
    "filename": "jewar_2026_crop.tif",
    "title": null,
    "status": "GEOREFERENCED",
    "width_px": 2048,
    "height_px": 2048,
    "band_count": 6,
    "bands": ["blue","green","red","rededge1","nir","swir16"],
    "bands_identified_by": "sentinel2_filename_convention",
    "crs_epsg": 32643,
    "bounds_4326": [77.71, 28.09, 77.81, 28.19],
    "gsd_m": 10.0,
    "gsd_source": "metadata",
    "acquired_at": "2026-08-03",
    "acquired_source": "metadata",
    "aoi_id": "b1d3...",
    "aoi_name": "Jewar Airport",
    "capability_tier": "T3_MEDIUM",
    "capabilities": {
      "object_classes": ["building_cluster","ship_large","storage_tank","road"],
      "landcover_classes": ["built","water","vegetation","bare","crop","snow"],
      "area_measurements": true,
      "temporal_analysis": true
    },
    "capability_notice": null,
    "checksum_sha256": "7e1b...",
    "overview_url": "/api/v1/uploads/c4a9.../overview.jpg",
    "created_at": "2026-09-12T09:14:22Z"
  },

  "detections": [
    {
      "id": "d1f0...",
      "track": "landcover_index",
      "label": "water",
      "label_raw": null,
      "kind": "polygon",
      "geom_px": {"type": "Polygon", "coordinates": [[[...]]]},
      "geom_4326": {"type": "Polygon", "coordinates": [[[...]]]},
      "area_px": 48210.0,
      "area_m2": 4821000.0,
      "area_label": "482.1 ha",
      "score": 0.94,
      "score_source": "deterministic",
      "verified": true,
      "verifier_note": null
    },
    {
      "id": "a83c...",
      "track": "object_model",
      "label": "building_cluster",
      "label_raw": "terminal building complex",
      "kind": "box",
      "geom_px": {"type": "Polygon", "coordinates": [[[412,880],[1104,880],[1104,1240],[412,1240],[412,880]]]},
      "geom_4326": {"type": "Polygon", "coordinates": [[[...]]]},
      "area_px": 250048.0,
      "area_m2": 25004800.0,
      "area_label": "2500.5 ha",
      "score": 0.87,
      "score_source": "model",
      "verified": false,
      "verifier_note": "model-identified; not verified against ground truth"
    }
  ],

  "coverage": {
    "source_track": "landcover_index",
    "total_px": 4194304,
    "by_class": [
      {"label": "crop",    "px": 1902110, "pct": 45.35, "area_m2": 190211000.0},
      {"label": "built",   "px": 1140220, "pct": 27.18, "area_m2": 114022000.0},
      {"label": "bare",    "px":  621004, "pct": 14.81, "area_m2":  62100400.0},
      {"label": "water",    "px":   48210, "pct":  1.15, "area_m2":   4821000.0},
      {"label": "vegetation","px":  402300, "pct":  9.59, "area_m2":  40230000.0},
      {"label": "unclassified","px": 80460,"pct":  1.92, "area_m2":   8046000.0}
    ],
    "sum_check_pct": 100.0
  },

  "counts": {
    "by_label": {"building_cluster": 3, "road": 7, "storage_tank": 2, "water": 1},
    "total_object_detections": 12,
    "total_landcover_detections": 6,
    "source": "SELECT count(*) FROM detection GROUP BY label"
  },

  "rejections": {
    "count": 9,
    "by_reason": {
      "label_not_permitted_at_tier": 5,
      "score_below_threshold": 2,
      "bbox_out_of_range": 1,
      "nms_duplicate": 1
    },
    "detail": [
      {"label_raw": "car", "reason": "label_not_permitted_at_tier",
       "detail": "'vehicle' is not detectable at 10 m GSD (tier T3_MEDIUM)"}
    ]
  },

  "job_id": "j_9912...",
  "trace_id": "t_4471..."
}
```

**Note `rejections` is part of the response, not hidden.** Showing what was thrown away is the same principle as the suppression panel.

---

## 5. The `ChangeSummary` object (B8)

```json
{
  "summary_id": "s_2210...",
  "aoi_id": "b1d3...",
  "upload_id": "c4a9...",
  "window": {"from": "2023-09-12", "to": "2026-09-12", "years": 3.0,
             "from_source": "parsed_from_question", "to_source": "upload_acquired_at"},
  "scenes": {
    "total": 36, "usable": 29, "unusable": 7,
    "unusable_reasons": {"cloud": 6, "cloud_shadow": 1},
    "gaps": [{"start": "2024-06-01", "end": "2024-09-30", "days": 121,
              "reason": "monsoon cloud", "scenes_lost": 4}],
    "median_interval_days": 31
  },
  "by_type": [
    {
      "change_type": "construction",
      "count": 6,
      "net_area_m2": 184320.5,
      "net_area_label": "18.43 ha",
      "gross_gain_m2": 191004.0,
      "gross_loss_m2": 6683.5,
      "earliest_onset": "2024-06-09",
      "latest_onset": "2026-02-11",
      "still_active": 4
    },
    {
      "change_type": "clearance",
      "count": 2, "net_area_m2": -30700.0, "net_area_label": "-3.07 ha",
      "gross_gain_m2": 0, "gross_loss_m2": 30700.0,
      "earliest_onset": "2025-03-04", "latest_onset": "2025-08-19", "still_active": 0
    },
    {
      "change_type": "water_loss",
      "count": 1, "net_area_m2": -18200.0, "net_area_label": "-1.82 ha",
      "gross_gain_m2": 0, "gross_loss_m2": 18200.0,
      "earliest_onset": "2025-04-11", "latest_onset": "2025-04-11", "still_active": 0,
      "note": "seasonal; 41 similar candidates suppressed as seasonal variation"
    }
  ],
  "change_object_ids": ["8f2c...", "1ab4...", "..."],
  "suppression": {"generated": 1840, "suppressed": 1834, "retained": 6,
                  "by_reason": {"seasonal": 1288, "cloud_shadow": 394, "registration": 122, "min_size": 30}},
  "narrative_facts": [
    {"fact_id": "f1", "kind": "count", "value": 6, "unit": "changes", "type": "construction"},
    {"fact_id": "f2", "kind": "area",  "value": 184320.5, "unit": "m2", "label": "18.43 ha", "type": "construction"},
    {"fact_id": "f3", "kind": "onset", "value": "2024-06-09", "type": "earliest_construction"},
    {"fact_id": "f4", "kind": "gap",   "value": ["2024-06-01","2024-09-30"], "days": 121, "reason": "monsoon cloud"},
    {"fact_id": "f5", "kind": "count", "value": 1834, "unit": "suppressed_candidates"},
    {"fact_id": "f6", "kind": "count", "value": 29, "unit": "usable_scenes"},
    {"fact_id": "f7", "kind": "count", "value": 36, "unit": "total_scenes"}
  ],
  "answer": { "...": "see §6 Answer object" },
  "trace_id": "t_4471...",
  "generated_at": "2026-09-12T09:16:40Z"
}
```

**Rule:** the prose answer may only quote values present in `narrative_facts`. The verifier enforces this. If you need a new figure in the prose, add the fact first.

---

## 6. The `Answer` object and the API surface

### `Answer`

```json
{
  "answer_id": "ans_8841...",
  "question": "What changes took place in 3 years in this area?",
  "question_normalised": "what changes took place in 3 years in this area",
  "intent": {"id": "aoi_change_summary", "score": 0.91, "matched_by": "embedding"},
  "slots": {"window_years": 3, "window_source": "parsed_from_question",
            "aoi_id": "b1d3...", "upload_id": "c4a9..."},
  "tier": "polished",
  "degraded": false,
  "text": "Over the last three years, six construction changes totalling 18.43 hectares...",
  "text_template": "Over the last three years, {f1} construction changes totalling {f2}...",
  "confidence": 0.84,
  "confidence_parts": {"data_completeness": 0.81, "detector_agreement": 0.90,
                       "suppression_cleanliness": 0.88, "temporal_coverage": 0.74,
                       "classification_margin": 0.86},
  "measurements": {"bundle_id": "mb_2210...", "facts": ["...see narrative_facts..."]},
  "highlights": {
    "change_object_ids": ["8f2c..."],
    "detection_ids": [],
    "focus_bbox_4326": [77.71, 28.09, 77.81, 28.19]
  },
  "sources": [
    {"kind": "scene", "id": "S2B_43RCU_20240609_0_L2A", "checksum": "9c2e..."},
    {"kind": "upload", "id": "c4a9..."},
    {"kind": "dataset", "id": "ESA WorldCover 2021 v200", "licence": "CC-BY-4.0"}
  ],
  "models_used": [{"name": "gemini-2.x-flash", "role": "phrasing", "verified": true}],
  "capability_notice": null,
  "trace_url": "/api/v1/ask/ans_8841.../trace",
  "report_url": "/api/v1/ask/ans_8841.../report.json",
  "generated_at": "2026-09-12T09:16:41Z"
}
```

### Endpoints

All under `/api/v1`. Successful responses are the object itself, never wrapped, except for lists which use `{"items": [...], "total": n}`.

| Method | Path | Feature | Returns |
|---|---|---|---|
| `GET` | `/aoi` | A1 | list of AOIs |
| `POST` | `/aoi` | A1 | `Aoi` |
| `GET` | `/aoi/{id}` | A1 | `Aoi` |
| `POST` | `/aoi/{id}/ingest` | A2 | `202` + `job_id` |
| `GET` | `/aoi/{id}/scenes` | A2/A6 | list of `Scene` |
| `GET` | `/aoi/{id}/changes` | A7 | list of `Evidence`, filtered |
| `POST` | `/aoi/{id}/analyse` | A7 | `202` + `job_id` |
| `GET` | `/aoi/{id}/summary` | B8 | `ChangeSummary` |
| `GET` | `/aoi/{id}/suppression` | A9 | counts by reason + sample reasons |
| `GET` | `/aoi/{id}/calibration` | A12 | reliability bins + ECE |
| `GET` | `/search/semantic` | A3 | `?q=&aoi_id=&limit=&before=&after=&min_cloud=` → ranked tiles |
| `GET` | `/search/similar` | A4 | `?tile_id=&limit=` → ranked tiles |
| `POST` | `/uploads` | B1 | `202` + `Upload` + `job_id` |
| `GET` | `/uploads` | B1 | list of `Upload` |
| `GET` | `/uploads/{id}` | B2 | `Upload` |
| `GET` | `/uploads/{id}/detections` | B3/B4 | `DetectionSet` |
| `GET` | `/uploads/{id}/overview.jpg` | B1 | image |
| `GET` | `/uploads/{id}/trace` | B9 | trace tree |
| `POST` | `/ask` | C1 | `{"question","aoi_id?","upload_id?"}` → `Answer` |
| `GET` | `/ask/{id}` | C1 | `Answer` |
| `GET` | `/ask/{id}/trace` | B9 | trace tree |
| `GET` | `/ask/{id}/report.json` | C5 | full report |
| `POST` | `/decisions` | A13 | `{"entity_type","entity_id","action","note?"}` → `Decision` |
| `GET` | `/audit` | A14 | list of audit entries |
| `GET` | `/export/aoi/{id}/manifest.json` | A15 | provenance manifest |
| `GET` | `/tiles/imagery/{z}/{x}/{y}.png` | A5 | `?scene_id=` |
| `GET` | `/tiles/mask/{z}/{x}/{y}.png` | A7 | `?change_object_id=` |
| `GET` | `/tiles/evidence/{id}/{before\|mask\|after}.png` | A7 | triptych panel |
| `POST` | `/jobs` | — | internal |
| `GET` | `/jobs/{id}` | — | `{"state","progress","result?","error?"}` |
| `GET` | `/meta/models` | A15 | model BOM with licences |
| `GET` | `/health` | — | `{"ok", "offline", "gemini", "db", "clip_loaded"}` |

### Query parameter rules for `/aoi/{id}/changes`

`type` (repeatable) · `min_area_m2` · `max_area_m2` · `after` · `before` · `min_confidence` · `status` · `trend` · `sort` (`area_desc` | `onset_asc` | `confidence_desc`) · `limit` (default 100, max 500) · `offset`

**Every one of these is a SQL predicate, never a post-filter in Python.** SIH26227 §2.2.6 requires scalable retrieval; filtering after fetching is the specific anti-pattern it is warning against.

---

## 7. Bounding-box coordinate convention ⚠️

> **THIS IS THE HIGHEST-RISK DETAIL IN THE PROJECT. Read carefully.**

Gemini's bounding-box output convention has varied across model versions. Two things have differed historically:
- the **normalisation scale** (0–1 or 0–1000)
- the **axis order** (`[ymin, xmin, ymax, xmax]` vs `[xmin, ymin, xmax, ymax]`)

**Do not hardcode either assumption.** Implement `domain/bbox.py` as:

```python
def normalise_bbox(raw: list[float], img_w: int, img_h: int) -> PixelBox | BboxReject:
    """
    Convert a model-returned bbox to pixel coordinates [x1, y1, x2, y2], origin top-left.

    Steps:
      1. Validate length == 4 and all values finite.
      2. Detect the normalisation scale:
           if max(raw) <= 1.0        -> scale = 1.0
           elif max(raw) <= 1000.0   -> scale = 1000.0
           else                      -> reject REASON_OUT_OF_RANGE
      3. Denormalise against img_w / img_h.
      4. Detect axis order using the configured convention (settings.GEMINI_BBOX_ORDER),
         defaulting to "yxyx". If the resulting box has x2 <= x1 or y2 <= y1,
         try the transpose ONCE; if that also fails, reject REASON_DEGENERATE.
         Record in the trace which order was used.
      5. Clamp to [0, img_w] / [0, img_h].
      6. Reject if clamping changed the box by more than 2% of its area
         (means the model was pointing outside the image).
    """
```

**Mandatory test:** create a synthetic 1000×800 image with a solid white 100×100 square at pixel (300, 200). Send it to Gemini asking for the square's bbox. Assert the returned box, after `normalise_bbox`, overlaps the true square at IoU ≥ 0.7. **Run this test before building any UI on top of bboxes.** If it fails, fix the convention first — every downstream feature depends on it.

Also record `settings.GEMINI_BBOX_ORDER` and the model id in `MODEL_PROVENANCE.md`, since the correct value is model-version-specific.

---

## 8. Error codes

Single envelope: `{"error": {"code", "message", "details", "trace_id"}}`

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Body/query malformed; `details` lists fields |
| `NOT_FOUND` | 404 | Entity does not exist |
| `UNSUPPORTED_FILE_TYPE` | 415 | B1 |
| `FILE_TOO_LARGE` | 413 | B1 |
| `FILE_UNREADABLE` | 422 | B1 — corrupt or unsupported compression |
| `NOT_GEOREFERENCED` | 200* | B8 State 3 — *not an error; returned with a `capability_notice`* |
| `RESOLUTION_INSUFFICIENT` | 200* | B3 — *not an error; returned with a `capability_notice` and partial results* |
| `NO_ARCHIVE_DATA` | 409 | B8 State 2 — ingestion required first |
| `NO_USABLE_SCENES` | 422 | Window contains no usable imagery |
| `NO_RESULTS` | 200* | Search/query found nothing — *returns empty list plus suggestions, not an error* |
| `INTENT_UNSUPPORTED` | 200* | Router could not match — returns the `unsupported` answer |
| `MODEL_UNAVAILABLE` | 503 | Gemini unreachable or `OFFLINE=1` — **must be handled by falling back to Tier 1, not surfaced to the user** |
| `VERIFIER_REJECTED` | — | Internal only; never an HTTP error. The answer degrades to template. |
| `JOB_FAILED` | 200 | In `/jobs/{id}` when `state == failed` |
| `RATE_LIMITED` | 429 | Gemini quota exhausted → degrade to Tier 1 |
| `INTERNAL` | 500 | Last resort; always logged with `trace_id` |

\* **Marked 200 deliberately.** A capability limit, an empty result, or an unmatched intent is a *successful answer about the world*, not a failure of the system. Returning 4xx here produces empty screens in the UI and reads as a broken demo. Return 200 with a `capability_notice` or a `NO_RESULTS` payload that includes suggestions.

**Never** return a raw stack trace. **Never** return `500` for something the user did.

---

## 9. Fixture files (required before any frontend work)

`frontend/src/fixtures/` and `backend/tests/fixtures/` must contain, shape-identical to the real responses:

| File | Contents |
|---|---|
| `aoi.json` | two AOIs |
| `scenes.json` | 36 scenes, 7 marked unusable with reasons |
| `evidence_list.json` | 6 change objects, full `Evidence` |
| `evidence_single.json` | one, fully populated including `rule_trace` |
| `suppression.json` | 312 suppressed across 8 reasons |
| `calibration.json` | 10 reliability bins + ECE |
| `upload_georeferenced.json` | full `Upload` + `DetectionSet`, T3 tier |
| `upload_visual_only.json` | `VISUAL_ONLY`, nulls in the right places |
| `upload_unknown_gsd.json` | `T0_UNKNOWN` with a `capability_notice` |
| `change_summary.json` | full `ChangeSummary` for B8 |
| `answer_polished.json` | tier `polished` |
| `answer_degraded.json` | tier `degraded` — verifier failed |
| `answer_unsupported.json` | intent `unsupported` |
| `trace.json` | complete trace tree |
| `job_running.json` / `job_failed.json` | job states |

**The frontend is built against these from hour one and never blocks on the backend.** When the real API lands, the fixtures are replaced by golden-file assertions that the real output still matches.
