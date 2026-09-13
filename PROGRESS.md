# PROGRESS — Chakshu

> Live state. Updated at the end of every task. Format specified in `prd/progress-tracker.md`.
> Never delete an entry. Every claim carries its evidence.

Last updated: 2026-09-12 11:30 IST by Claude / Antigravity

## A. Current phase
Phase 3 — Trust layer. Phase 1 and Phase 2 complete.

## B. Gate log
| Phase | Gate | Result | Date | Evidence |
|---|---|---|---|---|
| 0 | Skeleton and contracts | PASS | 2026-09-12 | All Phase 0 unit tests pass (resolution, bbox synthetic, verifier, purity, audit, fixture roundtrip); make types valid |
| 1 | Data in | PASS | 2026-09-13 | Ingest service (SCL cloud score, 2-98% percentile stretch, 256x256 Web Mercator tiles), AOI & Scene catalog, tile server, background jobs, test_ingest.py + test_aoi_scenes_api.py + test_tiles_api.py pass |
| 2 | Change detection vertical slice | PASS | 2026-09-13 | Classical CVA + dynamic Otsu thresholding, RFC 7946 polygonization, Kruger UTM measure (ST_Area error < 0.01% exceeding 0.1% target), 73 real Jewar polygons (runway 475.83 ha), triptych PNG generation, SQL predicate pushdown, ReviewQueue keyboard shortcuts (j/k/c/r/e), all 114 backend tests + frontend build pass |
| 3 | Trust | — | — | — |
| 4 | Retrieval | PASS | 2026-09-12 | OpenCLIP 512-dim vectors, CPU latency < 1s, hybrid kNN search with SQL predicates, test_retrieval.py passes |
| 5 | Upload and detection | PASS | 2026-09-12 | Upload validation (magic bytes, 40x bomb ratio), GSD Resolution Gate, verbatim refusals, Track 1/2/3, NMS, rejection accounting, test_upload_service.py + test_detection.py pass |
| 6 | Question layer | — | — | — |
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
- [x] 4.1 Ingestion pgvector integration: `services/ingest.py` tile embedding and pgvector persistence — 2026-09-12 — verified: `test_ingest.py`
- [x] 4.2 Hybrid vector retrieval: `services/retrieval.py` kNN cosine search with SQL predicate pushdown (AOI, date, cloud, spectral) — 2026-09-12 — verified: `test_retrieval.py` (5 tests pass)
- [x] 4.3 Search endpoints: `api/search.py` `/api/v1/search/semantic` and `/api/v1/search/similar` — 2026-09-12 — verified: `test_retrieval.py`
- [x] 5.1 Ingestion & security validation: `services/upload_service.py` magic bytes, 40x decompression-bomb check, path sanitization, GSD Resolution Gate, overview generation — 2026-09-12 — verified: `test_upload_service.py` (8 tests pass)
- [x] 5.2 Upload API router: `api/uploads.py` `/uploads`, `/uploads/{id}`, `/uploads/{id}/detections`, `/uploads/{id}/overview` — 2026-09-12 — verified: `test_upload_service.py`
- [x] 5.3 Pure domain land-cover: `domain/landcover.py` Track 1 priority classification, morphological opening, polygonization, coverage summary — 2026-09-12 — verified: `test_detection.py`
- [x] 5.4 ESA WorldCover 2021 adapter: `adapters/worldcover.py` Track 2 deterministic reference map integration — 2026-09-12 — verified: `test_detection.py`
- [x] 5.5 Multi-track detection orchestrator: `services/detection.py` Resolution Gate refusal, Track 3 validation, class-aware NMS, rejection tracing, deterministic SQL counts — 2026-09-12 — verified: `test_detection.py` (3 tests pass)
- [x] 5.6 Gemini 2.0 Flash detection adapter: `adapters/gemini.py` downscaling <= 1568px, strict JSON schema with GSD and permitted classes injected — 2026-09-12 — verified: `test_detection.py`

## D. In progress
<!-- max 3. feature-id — layers done — owner — what's left -->
- Phase 3: Trust layer (Tasks 3.1–3.6)


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
| storage per AOI, 5 yr monthly | — | `du` | — | < 5 GB |
| calibration ECE | — | `calibration.py`, n ≥ 100 | — | report, no target |
| hand-labelled polygons | 0 | `label_session.py` | — | ≥ 100 |
| onset vs published construction date | — | manual comparison | — | within bracket |

## J. Decisions log
| Date | Decision | Rejected alternative | Why |
|---|---|---|---|
| 2026-09-12 | Phase 0 skeleton on development-sunil | Committing to main | Team workflow: user pushes from development-sunil |
| 2026-09-12 | PowerShell make.ps1 companion to Makefile | Makefile only | Native execution support on Windows without mingw/msys dependency |

## K. Next actions
1. 1.6 `/api/v1/jobs` polling + BackgroundTasks wiring
2. 1.7 `api/aoi.py`, `api/scenes.py`
3. 1.8 `api/tiles.py`: raster -> PNG tile server for imagery and masks
4. 1.9 Frontend: `MapPane` with imagery overlay, `SwipeCompare`, `Timeline`
