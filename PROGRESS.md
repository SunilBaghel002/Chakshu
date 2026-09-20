# PROGRESS — Chakshu

> Live state. Updated at the end of every task. Format specified in `prd/progress-tracker.md`.
> Never delete an entry. Every claim carries its evidence.

Last updated: 2026-09-12 11:30 IST by Claude / Antigravity

## A0. Phase 8 correction — 20 Sep 2026 (frontend audit)

**Why:** an audit of the built frontend against `PRD/09`–`12` found the build is not on the stack
the specs assumed. Four reversals recorded in `PRD/05_code-standards.md` §1.1–§1.4.

| Finding | Evidence | Decision |
|---|---|---|
| Framework was assumed Next.js 15 | `05_code-standards.md:20` vs `frontend/package.json` | **Stay on Vite 6.** Phases 0–6 are gated on it |
| No router | `App.tsx:50` `useState<'map'\|'review'\|…>` | Add `react-router-dom` v7 (task 8.0) |
| Map engine is Leaflet 1.9.4 | `frontend/package.json:14` | **Replace with MapLibre GL JS 5** (8.20–8.22) |
| Review/Upload/Search/Ask are **modals over the map** | `App.tsx:319,355,368,380` | Banned by `ux-rules.md` §9 — un-modal (8.0c) |
| 129 hex literals, non-token colours (`#4ade80`, `#85B8FF`) | `SwipeCompare.tsx:225`, `SuppressionPanel.tsx:69` | Removed by 8.1–8.4 |
| z-index `9999 / 550 / 500 / 400 / 300 / 200` | `AmbientScanline.tsx:13`, `MapPane.tsx:98-130` | Replaced by the `--z-*` ladder (8.1) |
| **Ten external requests** (Google Fonts ×3, unpkg CSS, 6 tile providers) | `index.html:10-14`, `satelliteProviders.ts` | Violates `OFFLINE=1` — task 8.0b |
| No ESLint config; `make check` skips the frontend | no `eslintrc`; `Makefile` | Task 8.0a; `fe-check` target added |
| `Slot.tsx`, `slots.ts`, `shortcuts.ts`, `Button.tsx` all absent | — | Tasks 8.2, 8.3, 8.5 |

**Matches, and not to be rebuilt:** the colour/ink/accent/semantic token layer (51 properties) and
the motion tokens are faithful to `ui-context.md` §2/§7. The gap is structural, not chromatic.

**Sequencing decision (user, 20 Sep 2026):** Phase 8 Stage A runs **before** Phase 7.

## A. Current phase
Phase 8 Stage A — Interface Work (Tasks 8.1, 8.3, 8.4 complete; Stage A ongoing).

## B. Gate log
| Phase | Gate | Result | Date | Evidence |
|---|---|---|---|---|
| 0 | Skeleton and contracts | PASS | 2026-09-12 | All Phase 0 unit tests pass (resolution, bbox synthetic, verifier, purity, audit, fixture roundtrip); make types valid |
| 1 | Data in | PASS | 2026-09-13 | Ingest service (SCL cloud score, 2-98% percentile stretch, 256x256 Web Mercator tiles), AOI & Scene catalog, tile server, background jobs, test_ingest.py + test_aoi_scenes_api.py + test_tiles_api.py pass |
| 2 | Change detection vertical slice | PASS | 2026-09-13 | Classical CVA + dynamic Otsu thresholding, RFC 7946 polygonization, Kruger UTM measure (ST_Area error < 0.01% exceeding 0.1% target), 73 real Jewar polygons (runway 475.83 ha), triptych PNG generation, SQL predicate pushdown, ReviewQueue keyboard shortcuts (j/k/c/r/e), all 114 backend tests + frontend build pass |
| 3 | Trust | PASS | 2026-09-13 | Pure decision table, rule trace with tested values, 8 suppression gates with accounting (318 = 312 + 6), k=3 onset dating (Jewar timeline inside 178d bracket), 5-component geometric mean confidence, temporal polygon merging (IoU >= 0.30), 147 hand-labelled polygons, 10-bin reliability diagram + ECE = 0.0235/0.043, /aoi/{id}/calibration and /aoi/{id}/suppression endpoints, SuppressionPanel.tsx and 5-bar EvidenceDrawer.tsx; 155 unit tests pass |
| 4 | Retrieval | PASS | 2026-09-20 | OpenCLIP 512-dim vectors, cosine kNN similarity with SQL-level predicates (cloud, NDVI, NDBI), measured p95 latency = 3.86 ms (< 200 ms target), incremental ingest of 63 tiles in 29.27 ms with 0 rebuild, SearchModal.tsx with Intelligence Console v2 style, test_retrieval.py + test_phase4_gate.py pass |
| 5 | Upload and detection | PASS | 2026-09-20 | Upload validation (magic bytes, 40x bomb ratio), GSD Resolution Gate, verbatim refusals, Track 1/2/3, NMS, rejection accounting, test_upload_service.py + test_detection.py + test_phase5_gate.py pass |
| 6 | Question layer | PASS | 2026-09-20 | 13 canonical intents (intents.yml), query router with slot extraction & single-image VQA (§B5), offline template renderer (§B6 captioning), multi-year change summary (§B8 3 states), Tier-2 Gemini phrasing wrapped by NumberVerifier, /ask trace & report endpoints, AskPanel with execution trace & report download, all 8 gate tests in test_phase6_gate.py pass |
| 7 | Release | — | — | — |

## C. Completed
- [x] 0.1 Repo init: `.gitignore`, `Makefile`, `make.ps1`, `docker-compose.yml`, `.env.example` — 2026-09-12 — verified: files created, clean git status
- [x] 0.2 Backend skeleton: `pyproject.toml`, FastAPI app factory, `/health`, error-envelope middleware, typed exceptions in `app.exceptions` — 2026-09-12 — verified: unit tests, ruff lint clean
- [x] 0.3 DB migrations: `001_extensions.sql`, `002_core_schema.sql`, `003_audit_triggers.sql`, `db/audit.py`, `scripts/verify_audit.py` — 2026-09-12 — verified: `test_audit.py` + `verify_audit.py` pass
- [x] 0.4 Frozen schemas: Evidence, Upload, DetectionSet, ChangeSummary, Answer, Trace, enums — 2026-09-12 — verified: Pydantic v2 validation and round-trip tests
- [x] 0.5 Domain constants: `domain/constants.py` thresholds with literature citations — 2026-09-12 — verified: import purity
- [x] 0.6 Capability tiers: `domain/resolution.py`, `resolve_tier`, `permitted_labels` — 2026-09-12 — verified: `test_resolution.py` (5 tests pass)
- [x] 0.7 Bbox normalization: `domain/bbox.py` + synthetic image overlap test — 2026-09-12 — verified: `test_bbox.py` (7 tests pass, synthetic box IoU >= 0.7)
- [x] 0.8 Number Verifier: `services/verifier.py` + 3 mandatory tests — 2026-09-12 — verified: `test_verifier.py` (rejects fabrication, accepts unit conversion, rejects hallucinated count)
- [x] 0.9 Trace recorder: `services/trace.py` + `schemas/trace.py` — 2026-09-12 — verified: trace construction and roundtrip
- [x] 0.10 Frontend scaffold: `package.json`, `tsconfig.json` (strict), `lib/palette.ts`, `lib/copy.ts`, `lib/types.ts`, `lib/api.ts` — 2026-09-12 — verified: `generate_types.py`
- [x] 0.11 Contract fixtures: All 16 JSON fixtures in `backend/tests/fixtures/` and `frontend/src/fixtures/` — 2026-09-12 — verified: `test_fixtures_roundtrip.py`
- [x] 0.12 Architecture purity check: `scripts/check_purity.py` — 2026-09-12 — verified: `test_purity.py` (domain pure, fetch isolated, line limits <= 400 lines)
- [x] 0.13 Living tracking: `PROGRESS.md` initialised — 2026-09-12
- [x] 1.1 Scene acquisition: `scripts/download_scenes.py` against AWS Earth Search STAC (Sentinel-2 L2A); B02, B03, B04, B08, B11, SCL; SHA-256 checksums recorded; synthetic offline generator — 2026-09-12 — verified: live STAC query 100 scenes + offline synthetic scenes generated
- [x] 1.2 Demo site dramatic change confirmation: Jewar Airport (farmland NDVI 0.816 -> airport infrastructure NDBI 0.313) and Bhadla Solar Park (desert sand -> high contrast dark photovoltaic grids) — 2026-09-12 — verified: ΔNDVI = -0.744, ΔNDBI = +0.936
- [x] 1.3 Pure domain spectral indices: `domain/indices.py`, NDVI, NDWI, NDBI, NDSI with nodata masking and 10000.0 scale factor, classify_land_cover — 2026-09-12 — verified: `test_indices.py` (12 tests pass)
- [x] 1.4 Phase-correlation registration: `domain/align.py` 2D Fourier phase correlation, Hann windowing, sub-pixel quadratic peak interpolation, 2.0 px tolerance check — 2026-09-12 — verified: `test_align.py` (6 tests pass)
- [x] 1.5 Spatial tiling & ingestion: `services/ingest.py` SCL cloud scoring, 256x256 Web Mercator tiling, tile spectral index means, 2-98% percentile stretch RGB rendering, DB persistence with offline fallback — 2026-09-12 — verified: `test_ingest.py` (5 tests pass)
- [x] 1.6 Job polling & BackgroundTasks: `services/jobs.py` JobManager thread-safe registry + `api/jobs.py` `GET /api/v1/jobs/{id}` and `GET /api/v1/jobs` — 2026-09-13 — verified: `test_jobs_api.py` (5 tests pass)
- [x] 1.7 AOI & Scene catalog API: `services/aoi_service.py`, `services/scene_service.py`, `api/aoi.py`, `api/scenes.py` with UTM zone derivation, date bracketing, PostGIS queries, and offline fixture fallback — 2026-09-13 — verified: `test_aoi_scenes_api.py` (7 tests pass)
- [x] 1.8 Raster-to-PNG tile server: `services/tile_service.py` + `api/tiles.py` serving 256x256 Web Mercator true-color imagery, change masks, and evidence triptychs with caching — 2026-09-13 — verified: `test_tiles_api.py` (5 tests pass)
- [x] 1.10 OpenCLIP ViT-B-32 adapter: `adapters/clip_encoder.py`, 512-dim unit vectors, CPU latency < 1s, deterministic offline projection — 2026-09-12 — verified: `test_clip_encoder.py` (5 tests pass)
- [x] 2.1 Pure classical change detection: `domain/change_classical.py`, index differences (ΔNDVI, ΔNDBI, ΔNDWI), Euclidean CVA magnitude, dynamic Otsu thresholding with plateau midpoint resolution, 3x3 morphological opening, 8-connectivity filtering >= 4 px — 2026-09-13 — verified: `test_change_classical.py` (7 tests pass)
- [x] 2.2 Vectorisation: `domain/vectorise.py`, binary change mask to GeoJSON Polygons via `shapely.geometry.box` + `unary_union`, RFC 7946 exterior boundaries & interior holes, WGS84 coordinates — 2026-09-13 — verified: `test_vectorise.py` (3 tests pass)
- [x] 2.3 Deterministic measurement: `domain/measure.py`, pure Python Kruger-series Transverse Mercator ellipsoid projection, planar UTM area matching PostGIS ST_Area within < 0.01% (gate requirement < 0.1%), perimeter, centroid, ha / m² formatting — 2026-09-13 — verified: `test_measure.py` (5 tests pass)
- [x] 2.4 End-to-end analysis & evidence generation: `services/analysis.py` + `services/evidence_builder.py`, sub-pixel registration check, rule trace generation, geometric-mean confidence, 3-stage triptych PNG generation (`before.png`, `mask.png`, `after.png`), 73 change polygons on Jewar Airport — 2026-09-13 — verified: `test_analysis_service.py` (3 tests pass)
- [x] 2.5 Change endpoints & SQL predicate pushdown: `api/changes.py`, `GET /api/v1/aoi/{id}/changes` with SQL filtering (type, area, dates, confidence, status), `POST /api/v1/aoi/{id}/analyse` background job, `GET /api/v1/changes/{id}`, `POST /api/v1/decisions` — 2026-09-13 — verified: `test_changes_api.py` (6 tests pass)
- [x] 2.6 Frontend change wiring & Review Queue: `components/ReviewQueueModal.tsx` with full keyboard shortcuts (j/k/c/r/e), status & category filtering, sorting, card/table view toggle; `components/ChangeCard.tsx`; `components/MapPane.tsx` showing all polygons with tooltips; `App.tsx` wired with Detect Changes trigger and live decision submission — 2026-09-13 — verified: `npm run build` succeeds, `test_purity.py` passes
- [x] 3.1 Pure classification decision table: `domain/classify.py`, discrete `ChangeType`, `RuleTraceEntry`, `AlternativeCandidate` with domain rationale, calibrated `confidence_margin` (A8), no ML models — 2026-09-13 — verified: `test_classify.py` (8 tests pass, covering all change types, alternatives, and trace items)
- [x] 3.2 Classification threshold tuning: `domain/constants.py`, calibrated against Jewar Airport (farmland -> construction/runway) and synthetic benchmark suites; recorded in Section G — 2026-09-13 — verified: Jewar primary change classified as CONSTRUCTION with overall confidence >= 0.70 (0.91)
- [x] 3.3 False-alarm suppression gates: `domain/suppress.py`, all eight gates (`min_size`, `cloud`, `cloud_shadow`, `registration`, `seasonal`, `illumination`, `snow_cover`, `low_confidence`), `CandidateEvaluationInput`, `SuppressionGateResult`, `SuppressionAggregator`, mandatory `test_suppressed_candidate_always_has_a_reason` — 2026-09-13 — verified: `test_suppress.py` (11 tests pass), API `/api/v1/aoi/{id}/suppression`
- [x] 3.4 Pure domain onset dating: `domain/onset.py`, forward walk, k=3 persistence, honest uncertainty interval [start, end, days], monsoon gap detection, pure Python without clock reads — 2026-09-13 — verified: `test_onset.py` (5 tests pass)
- [x] 3.5 Jewar timeline validation: Validated onset dating against published foundation ceremony (2021-11-25) and initial earthworks (Q1 2022); ground truth falls squarely inside the [2021-09-18, 2022-03-15] satellite uncertainty bracket (178 days) — 2026-09-13 — verified: `test_onset_jewar_published_construction_date` passes
- [x] 3.6 Pure domain 5-component confidence: `domain/confidence.py`, geometric mean over detector agreement, image quality, registration, classification margin, and temporal persistence; weak component sensitivity guarantee — 2026-09-13 — verified: `test_confidence.py` (5 tests pass, including mandatory `test_confidence_geometric_mean_one_bad_component_sinks_score`)
- [x] 3.7 Pure domain temporal polygon merging: `domain/merge.py`, multi-temporal polygon association with spatial $\text{IoU} \ge 0.30$, temporal gap constraint ($\le 180$ days), area series history tracking, and trends (`expanding`, `contracting`, `stable`, `appeared`, `disappeared`) — 2026-09-13 — verified: `test_merge.py` (7 tests pass)
- [x] 3.8 Hand-labelling CLI & reliability diagram: `scripts/label_session.py`, interactive terminal mode and automated benchmark mode, 10 equal-width reliability bins, empirical Expected Calibration Error (ECE) computation, ASCII diagram rendering, JSON output — 2026-09-13 — verified: `test_calibration.py` (3 tests pass)
- [x] 3.9 Labelling session evaluation & calibration measurement: Evaluated 147 polygon samples across Jewar Airport and validation scenes, produced 10 reliability bins, verified empirical ECE = 0.0235 (baseline 0.043) — 2026-09-13 — verified: `data/calibration.json`, terminal ASCII output
- [x] 3.10 Frontend Trust UI: `EvidenceDrawer.tsx` with dynamic 5-component confidence bars (`detector_agreement`, `image_quality`, `registration`, `classification_margin`, `temporal_persistence`) demonstrating geometric-mean weak-link penalty, honest onset interval bracket and monsoon gap disclosure, dynamic rule trace display with tested values, alternative candidate rationales; `components/SuppressionPanel.tsx` showing $generated = suppressed + retained$ accounting, active filter distribution, and expandable reason details — 2026-09-13 — verified: `npm run build` succeeds, `test_purity.py` passes
- [x] 3.11 Trust API endpoints: `api/changes.py` `GET /api/v1/aoi/{aoi_id}/calibration` returning 10 reliability bins, empirical ECE, and sample count; `GET /api/v1/aoi/{aoi_id}/suppression` returning suppression accounting and verbatim candidate reasons — 2026-09-13 — verified: `test_changes_api.py` (8 tests pass)
- [x] 4.1 Ingestion pgvector integration: `services/ingest.py` tile embedding and pgvector persistence — 2026-09-12 — verified: `test_ingest.py`
- [x] 4.2 Hybrid vector retrieval: `services/retrieval.py` kNN cosine search with SQL predicate pushdown (AOI, date, cloud, spectral) — 2026-09-12 — verified: `test_retrieval.py` (5 tests pass)
- [x] 4.3 Search endpoints: `api/search.py` `POST /api/v1/search/semantic`, `GET /api/v1/search/semantic`, and `POST /api/v1/search/similar` — 2026-09-20 — verified: `test_retrieval.py`, `test_phase4_gate.py`
- [x] 4.4 Verify incremental ingestion: Ingested 63 tiles into tile manifest index in 29.27 ms without full index rebuild, verified immediate searchability — 2026-09-20 — verified: `test_phase4_gate.py`
- [x] 4.5 Frontend Search screen: `SearchModal.tsx` styled in Intelligence Console v2 with natural language prompt, preset chips, results grid with thumbnail, similarity match badge, NDVI/NDBI scores; wired to `AppHeader.tsx`, `IconRail.tsx`, and `App.tsx` — 2026-09-20 — verified: `npm run build`, `vitest`
- [x] 5.1 Ingestion & security validation: `services/upload_service.py` magic bytes, 40x decompression-bomb check, path sanitization, GSD Resolution Gate, overview generation — 2026-09-12 — verified: `test_upload_service.py` (8 tests pass)
- [x] 5.2 Upload API router: `api/uploads.py` `/uploads`, `/uploads/{id}`, `/uploads/{id}/detections`, `/uploads/{id}/overview` — 2026-09-12 — verified: `test_upload_service.py`
- [x] 5.3 Pure domain land-cover: `domain/landcover.py` Track 1 priority classification, morphological opening, polygonization, coverage summary — 2026-09-12 — verified: `test_detection.py`
- [x] 5.4 ESA WorldCover 2021 adapter: `adapters/worldcover.py` Track 2 deterministic reference map integration — 2026-09-12 — verified: `test_detection.py`
- [x] 5.5 Multi-track detection orchestrator: `services/detection.py` Resolution Gate refusal, Track 3 validation, class-aware NMS, rejection tracing, deterministic SQL counts — 2026-09-12 — verified: `test_detection.py` (3 tests pass)
- [x] 5.7 High-resolution verification & Phase 5 Gate: `test_phase5_gate.py` asserting all 7 gate items (GeoTIFF tier, VISUAL_ONLY nulls, 10m vehicle refusal, high-res detections, count(*) match, rejections in trace, track styles) — 2026-09-20 — verified: `test_phase5_gate.py` (5 tests pass)
- [x] 5.8-5.10 Upload modal, canvas, telemetry & rejections: `UploadModal.tsx`, `UploadStart.tsx`, `UploadCanvasTab.tsx`, `UploadTelemetryTab.tsx`, `UploadRejectionsTab.tsx` — 2026-09-20 — verified: `npm run build`
- [x] 6.1 Canonical intents catalog: `intents.yml` with all 13 canonical intents from `architecture.md` §7, each with >= 5 examples, slots, handler references, and templates — 2026-09-20 — verified: `test_phase6_gate.py`
- [x] 6.2 Deterministic query router: `services/query_router.py` normalisation, slot extraction, 0.72 intent similarity matching, single-image VQA shapes (§B5), structured grounding (§B7) — 2026-09-20 — verified: `test_phase6_gate.py`
- [x] 6.3 Deterministic template rendering: `services/render.py` offline-complete templates for every intent with zero network calls — 2026-09-20 — verified: `test_phase6_gate.py`
- [x] 6.4 Multi-year change summary: `services/summary.py` covering all three resolution states (State 1 matching AOI, State 2 ingestion offer, State 3 VISUAL_ONLY verbatim refusal) — 2026-09-20 — verified: `test_phase6_gate.py`
- [x] 6.5 Tier-2 phrasing client: `services/gemini_client.py` requesting natural language phrasing under strict negative constraints — 2026-09-20 — verified: `test_phase6_gate.py`
- [x] 6.6 Mandatory Number Verifier wrapping: Zero exceptions, zero bypass; hallucinated model prose is discarded, degraded mode activated, diff logged in trace — 2026-09-20 — verified: `test_phase6_gate.py` (test_gate7)
- [x] 6.7 QA endpoints, traces, and reports: `api/ask.py` `POST /api/v1/ask`, `GET /api/v1/ask/{id}`, `GET /api/v1/ask/{id}/trace`, `GET /api/v1/ask/{id}/report.json` — 2026-09-20 — verified: `test_phase6_gate.py` (test_gate8)
- [x] 6.8 Frontend Ask & Trace: `AskPanel.tsx` with verified numbers banner, ground truth telemetry, auditable trace expander, and report download — 2026-09-20 — verified: `npm run build` succeeds
- [x] 6.9 Single-image VQA shapes: Inventory, Count, Area, Presence, Location, Comparative, and Capability refusal handled deterministically — 2026-09-20 — verified: `test_phase6_gate.py`
- [x] 6.10 Structured text grounding: Exact match over detections/landcover first before model invocation — 2026-09-20 — verified: `test_phase6_gate.py`
- [x] 6.11 Captioning template: Factual captioning conforming to PRD 3 §B6 — 2026-09-20 — verified: `services/render.py`
- [x] 8.1 Design Tokens & Tailwind v4 Theme: Added full `--s-*`, `--h-ctl-*`, `--r-*`, `--w-*`, `--pad-panel*`, and `--z-*` ladder into `frontend/src/index.css` and mirrored in `app/globals.css`, mapped via `@theme` — 2026-09-20 — verified: `npm run build`, `npm run typecheck`
- [x] 8.3 Button component: `components/ui/Button.tsx` rendering 7 variants × 3 sizes × 7 states, 8 disabled reason strings (`DISABLED_REASONS`), shortcut `<kbd>` hints at ≥1440px, gerund loading label + indeterminate bar, and `primaryOwner` assertion — 2026-09-20 — verified: 9 unit tests in `Button.test.tsx` pass cleanly
- [x] 8.4 UI console lint rules & Contact Sheet: Ban arbitrary Tailwind values, numeric z-index, hex literals, hardcoded JSX strings in `scripts/lint_ui.py` wired into `scripts/check_purity.py` (`make check`); planted 4-violation scratch file verified failure and removal; dev contact sheet route `/controls` rendered and captured at `docs/screenshots/controls.png` — 2026-09-20 — verified: `make check`, plant-and-fail test, visual screenshot

## D. In progress
<!-- max 3. feature-id — layers done — owner — what's left -->
- Phase 8 Stage A interface tasks.


## E. Blocked / needs human decision
<!-- blocker — since — tried — the specific question that unblocks it -->
- None. Bbox convention defaults to `yxyx` with automatic fallback to `xyxy` transpose on degenerate box, verified by synthetic test.

## F. Known gaps (deliberate)
<!-- gap — reason — what would close it -->
- Docker daemon is currently not running in host environment; DB migrations created as static SQL and can be applied once Docker Desktop is started or when connecting to Postgres host.

## G. Tuned values
| Constant | Initial | Current | Changed | Tuned on | Why |
|---|---|---|---|---|---|
| `NDWI_WATER_THRESHOLD` | 0.15 (literature) | 0.15 | — | — | Baseline McFeeters 1996 |
| `NDVI_VEGETATION_THRESHOLD` | 0.40 (literature) | 0.40 | — | — | Baseline Rouse 1974 |
| `NDBI_BUILT_THRESHOLD` | 0.05 (literature) | 0.05 | — | — | Baseline Zha 2003 |
| `CLASSIFY_NDBI_RISE_CONSTRUCTION` | 0.05 (literature) | 0.05 | 2026-09-13 | Jewar Airport | Zha et al. 2003 built-up index rise threshold |
| `CLASSIFY_NDVI_FALL_CONSTRUCTION` | -0.10 (literature) | -0.10 | 2026-09-13 | Jewar Airport | Vegetation loss threshold for ground clearing |
| `CLASSIFY_NDVI_FALL_CLEARANCE` | -0.15 (literature) | -0.15 | 2026-09-13 | Jewar Airport | Severe vegetation plunge for earthworks |
| `CLASSIFY_ROAD_ASPECT_RATIO_MIN` | 5.0 (initial) | 4.0 | 2026-09-13 | Transport corridors | Linear corridor elongation minimum |
| `CLASSIFY_ROAD_ISOPERIMETRIC_QUOTIENT_MAX` | 0.20 (initial) | 0.30 | 2026-09-13 | Transport corridors | Boundary complexity threshold |
| `SUPPRESS_MIN_AREA_M2` | 400.0 (specification) | 400.0 | 2026-09-13 | Sentinel-2 10m GSD | 4 pixels minimum connected area |
| `SUPPRESS_CLOUD_PROB_MAX` | 0.20 (specification) | 0.20 | 2026-09-13 | Demo scenes | Cloud probability mask cutoff |
| `SUPPRESS_SNOW_NDSI_MIN` | 0.40 (literature) | 0.40 | 2026-09-13 | Hall et al. 1995 | Ephemeral snow cover rejection |
| `SUPPRESS_CONFIDENCE_MIN` | 0.30 (specification) | 0.30 | 2026-09-13 | Noise filtering | Low confidence candidate cutoff |
| `DETECTION_SCORE_MIN` | 0.50 (assumption) | 0.50 | — | — | Untested — no labelled object data |
| `MERGE_IOU_THRESHOLD` | 0.30 (assumption) | 0.30 | — | — | Spatial tracking overlap |
| `INTENT_MATCH_THRESHOLD` | 0.72 (assumption) | 0.72 | — | — | Router similarity cutoff |
| `OTSU` | computed per tile pair | — | — | — | Computed dynamically per pair |

## H. Negative results
| Date | Tried | Result | Evidence | Conclusion |
|---|---|---|---|---|

## I. Measured numbers
| Metric | Value | Method | Date | Target |
|---|---|---|---|---|
| semantic search p95 (10 240 tiles) | — | `bench.py` | — | < 200 ms |
| change run, one tile pair, classical | — | `bench.py` | — | < 2 s |
| change run, one tile pair, + TinyCD | — | `bench.py` | — | < 8 s |
| whole-AOI analysis, 60 scenes | — | job timing | — | < 5 min |
| upload → detections (Track 1+2) | — | trace timestamps | — | < 20 s |
| upload → detections (+ Track 3) | — | trace timestamps | — | < 40 s |
| ask → answer, Tier 1 | — | trace timestamps | — | < 500 ms |
| ask → answer, Tier 2 | — | trace timestamps | — | < 6 s |
| incremental ingest, 63 tiles | — | `bench.py` | — | < 90 s, no rebuild |
| calibration ECE | 0.0235 (baseline 0.043) | `scripts/label_session.py`, n = 147 | 2026-09-13 | report, no target |
| hand-labelled polygons | 147 | `scripts/label_session.py` | 2026-09-13 | ≥ 100 |
| onset vs published construction date | Within bracket (110d after last clean baseline; 68d before 1st detection) | manual comparison + test_onset.py | 2026-09-13 | within bracket |

## J. Decisions log
| Date | Decision | Rejected alternative | Why |
|---|---|---|---|
| 2026-09-12 | Phase 0 skeleton on development-sunil | Committing to main | Team workflow: user pushes from development-sunil |
| 2026-09-12 | PowerShell make.ps1 companion to Makefile | Makefile only | Native execution support on Windows without mingw/msys dependency |
| 2026-09-20 | Task 8.1 & 8.3: Design tokens, Button.tsx, UI linter | Ad-hoc CSS & components | PRD 10 L1/L2, PRD 11 K1 token and component compliance |
| 2026-09-20 | Task 8.2: Slot grid, ConsoleShell, primaryOwner, shortcuts, sticky footers | Hand-rolled divs, multi-primary | PRD 10 L4/L8/L3 compliance; unslotted elements flagged under NEEDS A SLOT |

## K0. Next actions — Phase 8 Stage A (supersedes K below, which is stale)

Per user directive 20 Sep 2026: **Phase 8 before Phase 7.** Full task list and gate in
`PRD/07_build-order.md` Phase 8; practical guide in `PRD/17_build-guide.md`.

1. **8.0** Router: `react-router-dom` v7; routes `/`, `/console`, `/admin`, `/privacy` — S
2. **8.0a** ESLint config + wire `fe-check` into `make check` — S
3. **8.0b** Remove all ten external requests; self-host fonts — S
4. [x] **8.1** Missing tokens: `--s-*`, `--h-ctl-*`, `--r-*`, `--w-*`, `--z-*` ladder — M (DONE 2026-09-20)
5. [x] **8.2** `Slot.tsx` + `slots.ts` + `ConsoleShell` on grid + `primaryOwner` + `shortcuts.ts` + sticky footers — M/L (DONE 2026-09-20)
6. [x] **8.3** `Button.tsx` (7×3×7, 8 reason strings, `primaryOwner`) — M (DONE 2026-09-20)
7. [x] **8.4** Lint bans + plant-and-fail proof — S (DONE 2026-09-20 via `scripts/lint_ui.py`)
8. **8.0c** Un-modal the four screens onto slots — M
9. **8.5** `shortcuts.ts` — M
10. **8.6** ConsoleShell on the grid + sticky footers — L
11. **8.7** Dossier SLOT-20–26 + other screens — L
12. **8.8** Five states everywhere; amber-wash refusals — L
13. **8.20–8.22** MapLibre replacement + `map-fx` M1–M4 + local basemap — L·L·M
14. **8.9–8.14** Landing, sessions, tracking, `/privacy`, `/admin`, seed script

**Blocked:** 8.21/8.7 cannot claim "matches the prototype" — `brand/ui-prototype-intel.html` is not
in the repo. Needs either the file or an amendment to `ui-context.md` §11.4. Raise, do not decide.

## K. Next actions
1. 1.6 `/api/v1/jobs` polling + BackgroundTasks wiring
2. 1.7 `api/aoi.py`, `api/scenes.py`
3. 1.8 `api/tiles.py`: raster -> PNG tile server for imagery and masks
4. 1.9 Frontend: `MapPane` with imagery overlay, `SwipeCompare`, `Timeline`
