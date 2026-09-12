# PRD 7 — Build Order

> **Audience:** Claude Code and human developers.
> **Status:** Authoritative sequencing. Tasks within a phase may be parallelised across people; phases may not be reordered without editing this file.
> **Depends on:** all other PRD files. Human-facing day plan: `../docs/05-BUILD-PLAN-4-DAYS.md`

**The organising principle:** get one real change polygon onto one real map as fast as possible, then add features to a thing that already works. Every phase ends with a gate. **Do not start the next phase until the gate passes.** A gate that fails is a stop-the-world event, not a note.

---

## Phase 0 — Skeleton and contracts

**Goal:** an empty system that runs, with every contract fixed.

| # | Task | Feature |
|---|---|---|
| 0.1 | Repo init: `.gitignore`, `Makefile`, `docker-compose.yml` (Postgres 17 + PostGIS + pgvector), `.env.example` | — |
| 0.2 | `backend/`: pyproject with ruff + mypy config per `code-standards.md` §2; FastAPI app factory; `/health`; error-envelope middleware; typed exceptions | — |
| 0.3 | `db/`: all migrations from `architecture.md` §4, including the append-only triggers and the `make verify-audit` chain | A14 |
| 0.4 | `schemas/`: **every** Pydantic model from `data-contracts.md` — Evidence, Upload, DetectionSet, ChangeSummary, Answer, enums | all |
| 0.5 | `domain/constants.py`: every threshold from `architecture.md` §6, each with a source comment | — |
| 0.6 | `domain/resolution.py`: capability tiers, `resolve_tier`, `permitted_labels` + unit tests | B3 |
| 0.7 | `domain/bbox.py`: `normalise_bbox` per `data-contracts.md` §7 + **the synthetic-image verification test** | B3 |
| 0.8 | `services/verifier.py` + the three mandatory verifier tests | C2 |
| 0.9 | `services/trace.py` + the `Trace` schema | B9 |
| 0.10 | `frontend/`: Next.js scaffold, `strict` tsconfig, eslint no-`any`, `lib/api.ts` with zod, `lib/copy.ts`, `lib/palette.ts`, `make types` generation | — |
| 0.11 | **Every fixture file** from `data-contracts.md` §9, hand-written to match the schemas exactly | all |
| 0.12 | The architecture purity check script, wired into `make check` | — |
| 0.13 | `PROGRESS.md` initialised | — |

### 🚪 Phase 0 gate
- [ ] `docker compose up` gives a working Postgres with all three extensions
- [ ] `make check` passes on a repo with no features
- [ ] Every schema in `data-contracts.md` round-trips through its fixture
- [ ] `make types` produces a frontend `types.ts` that compiles
- [ ] The bbox verification test has been run against the real Gemini API and the convention is **recorded in `PROGRESS.md`** — or the task is escalated as blocked
- [ ] The verifier rejects a fabricated number and accepts a correct unit conversion

**Why 0.7 and 0.8 are here and not later:** the bbox convention and the verifier are the two things that, if wrong, invalidate weeks of downstream work. Both are cheap to verify now and expensive to discover in Phase 5.

---

## Phase 1 — Data in

**Goal:** real Sentinel-2 pixels on disk and in the database for one demo site.

| # | Task | Feature |
|---|---|---|
| 1.1 | `scripts/download_scenes.py` against AWS open-data; bands B02 B03 B04 B08 B11 SCL only; checksums recorded | A2 |
| 1.2 | **Confirm the demo sites show dramatic change** by eyeballing them in Copernicus Browser or EO Browser. If a site is boring, stop and pick another. | A2 |
| 1.3 | `domain/indices.py`: NDVI, NDWI, NDBI, NDSI — vectorised, nodata-masked, scale-factor-aware + unit tests against hand-computed values | A7 |
| 1.4 | `domain/align.py`: phase-correlation shift estimate + tolerance check | A7 |
| 1.5 | `services/ingest.py`: reproject to UTM, tile 256×256, cloud-score from SCL, monthly-best selection, DB writes | A2 |
| 1.6 | `/api/v1/jobs` polling + `BackgroundTasks` wiring | A2 |
| 1.7 | `api/aoi.py`, `api/scenes.py` | A1, A2, A6 |
| 1.8 | `api/tiles.py`: raster → PNG tile server for imagery and masks | A5 |
| 1.9 | Frontend: `MapPane` with the imagery overlay, `SwipeCompare`, `Timeline` — **against fixtures first, then the real API** | A5, A6 |
| 1.10 | `adapters/clip_encoder.py`: load ViT-B-32, embed a tile, verify CPU latency | A3 |

### 🚪 Phase 1 gate
- [ ] ≥ 40 usable monthly scenes ingested for Jewar, 2021–2026
- [ ] NDVI on a known vegetated tile is in `[0.5, 0.9]` and on a known urban tile in `[-0.1, 0.3]`. **If it is not, the scale factor or band order is wrong. Do not proceed.**
- [ ] The swipe slider wipes between two real dates, georegistered, with no visible offset
- [ ] The timeline shows real unusable dates, correctly, for monsoon months
- [ ] A tile renders in the browser in under 500 ms
- [ ] CLIP embeds a tile on CPU in under 1 s

---

## Phase 2 — Change detection, the vertical slice

**Goal:** the single most important moment of the build — a real polygon on a real map.

| # | Task | Feature |
|---|---|---|
| 2.1 | `domain/change_classical.py`: Δindex CDA + Otsu + morphological open + connected components + min-area filter | A7 |
| 2.2 | `domain/vectorise.py`: mask → GeoJSON polygons | A7 |
| 2.3 | `domain/measure.py`: area, perimeter, centroid in UTM | A10 |
| 2.4 | `services/analysis.py`: orchestrate 2.1→2.3 over consecutive usable pairs | A7 |
| 2.5 | `api/changes.py`: `/aoi/{id}/changes` with every filter from `data-contracts.md` §6, **all as SQL predicates** | A7 |
| 2.6 | Frontend: polygons on the map, `ReviewQueue`, `ChangeCard` | A7, A13 |

### 🚪 Phase 2 gate — **the critical gate**
- [ ] At least one real change polygon appears on the Jewar map, from real Sentinel-2 data, with a plausible area in hectares
- [ ] The polygon visually corresponds to something a human can confirm in the before/after imagery
- [ ] `area_m2` matches `ST_Area` on the same geometry to within 0.1%
- [ ] The `/changes` endpoint filters correctly by area and date, verified by SQL EXPLAIN showing the predicate is applied in the query

**If this gate fails, do not continue to Phase 3.** Everything after this depends on it. Debug per `ai-workflow-rules.md` §8–9: dtype, scale factor, nodata, band order, CRS. Report the failure to the human rather than tuning thresholds until something appears.

---

## Phase 3 — Trust: classification, suppression, onset, confidence

**Goal:** turn "some pixels changed" into "a dated, typed, measured, suppressed-and-justified change object."

| # | Task | Feature |
|---|---|---|
| 3.1 | `domain/classify.py`: the decision table + `rule_trace` + alternatives | A8 |
| 3.2 | Tune the classification thresholds on the demo sites. **Record every change in `PROGRESS.md` with date, site, and before/after value.** | A8 |
| 3.3 | `domain/suppress.py`: all eight gates, each writing a reason string | A9 |
| 3.4 | `domain/onset.py`: forward walk, k=3 persistence, interval + gaps | A11 |
| 3.5 | Validate onset against a published construction date for Jewar. Record the delta. | A11 |
| 3.6 | `domain/confidence.py`: five components, geometric mean | A12 |
| 3.7 | `domain/merge.py`: polygons → `change_object` entities over time, per `feature-specs.md` §B8 step 4 | A7, B8 |
| 3.8 | `scripts/label_session.py`: the hand-labelling CLI | A12 |
| 3.9 | **Run the labelling session: 100–150 polygons.** Produce the reliability diagram and ECE. | A12 |
| 3.10 | Frontend: `EvidencePanel` triptych, confidence bars, `SuppressionPanel`, rule-trace display | A8, A9, A12 |
| 3.11 | `api/changes.py`: suppression counts, calibration endpoint | A9, A12 |

### 🚪 Phase 3 gate
- [ ] Every retained polygon has a non-empty `rule_trace` a human can read
- [ ] Every suppressed candidate has a reason; the panel shows counts by reason summing to the total
- [ ] Onset dating matches the published Jewar construction timeline within the stated bracket — **or the mismatch is documented honestly in `PROGRESS.md`**
- [ ] ≥ 100 polygons hand-labelled; a reliability diagram and ECE exist as real measured numbers
- [ ] Confidence for a change with one bad component is visibly lower than one with all-good components (geometric mean working)

---

## Phase 4 — Retrieval

**Goal:** semantic and image-to-image search.

| # | Task | Feature |
|---|---|---|
| 4.1 | `services/ingest.py`: embed every tile → pgvector; HNSW index | A3 |
| 4.2 | `services/retrieval.py`: hybrid query — vector kNN **with** AOI/date/cloud predicates inside the SQL | A3 |
| 4.3 | `api/search.py`: `/search/semantic`, `/search/similar` | A3, A4 |
| 4.4 | Verify incremental ingestion: add 63 tiles, confirm no index rebuild, measure time | A16 |
| 4.5 | Frontend: `Search` screen with the results grid | A3 |

### 🚪 Phase 4 gate
- [ ] "newly built structures near a river" returns sensible ranked tiles on a demo site
- [ ] Search latency < 200 ms p95 over the full tile set, measured
- [ ] Incremental ingest of 63 tiles requires no rebuild; time recorded
- [ ] **A query you did not write yourself** returns either sensible results or an honest empty state. Test this — it is the difference between a search engine and a magic trick.

---

## Phase 5 — Upload and detection (the new SIH26167 work)

**Goal:** a user-supplied image becomes labelled, highlighted, measured detections.

| # | Task | Feature |
|---|---|---|
| 5.1 | `services/upload_service.py`: validation, security checks per `code-standards.md` §12, rasterio read, band identification, CRS/GSD/date extraction, tier assignment | B1 |
| 5.2 | `api/uploads.py` + overview generation | B1, B2 |
| 5.3 | `domain/`: land-cover classification from indices (Track 1) | B4 |
| 5.4 | `adapters/worldcover.py` + Track 2 | B4 |
| 5.5 | `services/detection.py`: Track 3 orchestration, label aliasing, validation, NMS, rejection logging | B3 |
| 5.6 | `adapters/gemini.py` + the strict-JSON detection prompt with GSD and permitted labels injected | B3 |
| 5.7 | **Verify detections against a high-resolution test image** (Cartosat or an aerial photo) before building UI | B3 |
| 5.8 | Frontend: `UploadPanel`, metadata panel, canvas overlay with boxes and polygons, solid-vs-dashed track distinction, class filter, detail card | B2, B3, B4 |
| 5.9 | Coverage summary bar — percentages from SQL pixel counts | B4 |
| 5.10 | The capability-refusal UI path, with verbatim messages | B3 |

### 🚪 Phase 5 gate
- [ ] A georeferenced GeoTIFF uploads, gets the right tier, and produces land-cover polygons that visually align with the image
- [ ] A plain PNG lands as `VISUAL_ONLY` with nulls in every geo field, and the UI shows em dashes, never zeros
- [ ] A 10 m image produces **no** `vehicle` or `aircraft` detections, and the refusal message appears verbatim
- [ ] A high-resolution image produces boxes that a human confirms land on the right objects
- [ ] Displayed counts equal `SELECT count(*)` — asserted by a test, not by inspection
- [ ] Rejections are visible in the trace with reasons
- [ ] Track 3 boxes render dashed; Tracks 1/2 render solid; the legend explains the difference

---

## Phase 6 — The question layer

**Goal:** free-text questions over both AOIs and uploads, with a full trace.

| # | Task | Feature |
|---|---|---|
| 6.1 | `intents.yml`: all 13 intents from `architecture.md` §7, each with ≥ 5 example utterances, slots, handler reference, template | C1 |
| 6.2 | `services/query_router.py`: normalise → extract slots → embed → match → execute → MeasurementBundle | C1 |
| 6.3 | `services/render.py`: templates for every intent, complete without any model | C1, B6 |
| 6.4 | `services/summary.py`: the multi-year change summary per `feature-specs.md` §B8, including all three states | B8 |
| 6.5 | `services/gemini_client.py`: Tier-2 phrasing, wrapped by the verifier, with `degraded` handling | C1 |
| 6.6 | Wire the verifier into every Tier-2 path. **No exceptions, no bypass flag.** | C2 |
| 6.7 | `api/ask.py` + trace and report endpoints | C1, B9, C5 |
| 6.8 | Frontend: `AskPanel`, `TracePanel`, map highlighting from `answer.highlights`, capability-notice rendering | C1, B9 |
| 6.9 | Single-image VQA question shapes per `feature-specs.md` §B5 | B5 |
| 6.10 | Text-guided grounding, structured path first per §B7 | B7 |
| 6.11 | Captioning template per §B6 | B6 |

### 🚪 Phase 6 gate
- [ ] "What changed here in 3 years?" on a georeferenced upload returns a full `ChangeSummary` with correct numbers, disclosed gaps, and suppression counts
- [ ] The same question on a `VISUAL_ONLY` upload returns the verbatim refusal, not an error and not a guess
- [ ] "How many buildings?" returns the DB count — and a test proves the model's prose count is not used
- [ ] Every number in every answer appears in `narrative_facts` and passes the verifier
- [ ] An out-of-scope question routes to `unsupported` with the honest message and never reaches Gemini
- [ ] `OFFLINE=1`: every intent still produces a complete answer
- [ ] A deliberately fabricated model response (injected via a test fixture) is caught by the verifier, degrades to template, and the failure is visible in the trace
- [ ] The trace shows: intent + score, slots, SQL, bundle, model call, verifier verdict

---

## Phase 7 — Decisions, audit, export, and hardening

| # | Task | Feature |
|---|---|---|
| 7.1 | `api/decisions.py` + the hash chain + `make verify-audit` | A13, A14 |
| 7.2 | `api/export.py`: provenance manifest | A15 |
| 7.3 | Frontend: `AuditScreen`, decision buttons, export button | A13–A15 |
| 7.4 | `scripts/bench.py` → writes `EVALUATION_REPORT.md` with all measured numbers | — |
| 7.5 | `MODEL_PROVENANCE.md`: every model and dataset with source, version, licence, commercial-use verdict | A15 |
| 7.6 | **Licence audit.** Confirm no GPL/AGPL and no CC-BY-NC weight is in the shipped path. | A15 |
| 7.7 | `pytest -m offline` with `OFFLINE=1`, full suite | C3 |
| 7.8 | Pre-warm every cache: tiles, change runs, embeddings, detections, overviews | — |
| 7.9 | Empty states, error states, and loading states on every screen | — |
| 7.10 | Record the fallback demo video | — |
| 7.11 | Rehearse the demo three times, timed | — |

### 🚪 Phase 7 gate — the release gate
- [ ] All twelve success criteria in `project-overview.md` §7 are demonstrable
- [ ] `make check` passes clean
- [ ] `make offline` passes clean
- [ ] `make verify-audit` passes
- [ ] Tampering with an audit row is detected by `make verify-audit`
- [ ] `EVALUATION_REPORT.md` contains only measured numbers, each with its measurement method
- [ ] `MODEL_PROVENANCE.md` lists every weight and dataset with a licence verdict
- [ ] The full demo script runs in under 2 minutes with zero spinners
- [ ] The demo runs with the network physically disabled

---

## Dependency graph

```
Phase 0 ──► Phase 1 ──► Phase 2 ──┬──► Phase 3 ──► Phase 4
                                  │
                                  └──► Phase 5 ──► Phase 6 ──► Phase 7
```

- **Phase 0 blocks everything.** Its whole purpose is to remove ambiguity later.
- **Phase 2 blocks Phases 3 and 5.** Change detection is the substrate for classification, suppression, onset, merging, and summaries.
- **Phases 4 and 5 are independent of each other** and can run in parallel with different people.
- **Phase 6 needs both 3 and 5**, because the summary intent spans change objects and uploads.
- **Phase 7 needs everything.**

**Critical path:** 0 → 1 → 2 → 3 → 6 → 7. Phases 4 and 5 hang off it and can absorb slack or be cut.

---

## Cut order

If a phase is running long, cut in this order. Never cut upward.

| Cut | What you lose |
|---|---|
| 1. Phase 4 entirely | Semantic search. The demo becomes "pick an area, analyse it" rather than "search it." **This is the biggest cut and the least damaging** — the change pipeline and the upload features are the differentiators. |
| 2. Track 2 (WorldCover) in Phase 5 | Land-cover labels come only from indices. Less authoritative, still correct. |
| 3. TinyCD corroboration | Confidence loses one component. Recalculate the geometric mean over four. |
| 4. B6 captioning | SIH26167 requires captioning **or** grounding. You have grounding (B7). Still compliant. |
| 5. A4 image-to-image search | One button. |
| 6. A11 onset validation against a published date | Keep the feature, drop the external validation. Weaker but honest. |
| 7. PDF export | JSON only. |
| 8. The third demo site | Two sites. |

**Never cut:** Phase 2, the suppression panel, the verifier, the Resolution Gate refusals, the trace, the audit log, the offline path, `EVALUATION_REPORT.md`, `MODEL_PROVENANCE.md`.

Cutting any of those removes the thing that distinguishes this project from every other satellite-AI hackathon entry.

---

## Task sizing

Every task above should be **2–6 hours for one person.** If a task is bigger, split it and record the split in `PROGRESS.md`. If it is much smaller, merge it with its neighbour.

A task is complete only when: code + tests + fixture + frontend wiring (if applicable) + `make check` passing + `PROGRESS.md` updated. **"The backend is done, the frontend is tomorrow" is not a complete task** — that is how integration debt accumulates.
