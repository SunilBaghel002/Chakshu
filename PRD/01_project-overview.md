# PRD 1 — Project Overview

> **Audience:** Claude Code and human developers.
> **Status:** Authoritative. If code disagrees with this file, the code is wrong.
> **Read with:** `architecture.md`, `feature-specs.md`, `data-contracts.md`, `code-standards.md`, `ai-workflow-rules.md`, `build-order.md`

---

## 1. What we are building

**Chakshu** (चक्षु — *proof, evidence*) is a web application that answers questions about a place on Earth using satellite imagery, and shows the evidence for every answer.

It does two jobs that are usually sold as separate products:

1. **Find and measure change.** Given an area, it compares satellite images across years, finds what changed, measures how big it is, dates when it started, and explains why it classified the change the way it did.
2. **Look at one image and describe it.** Given a single uploaded satellite image, it identifies and highlights the objects and land-cover classes in it, and answers questions about them.

Job 1 satisfies **SIH26227** (Ministry of Defence). Job 2 satisfies **SIH26167** (ISRO/SAC). They are one system, not two: job 2 is the conversation and single-image layer sitting on top of job 1's pipeline.

**Tagline:** *Every change, with proof.*

---

## 2. The single most important rule in this project

> ## The AI never produces a number.

Every quantity Chakshu displays — area, distance, count, date, percentage, coordinate — is computed by deterministic code (geometry, arithmetic, SQL, or database aggregation). A language model may **understand a question** and may **phrase an answer**, but it may never be the source of a measurement.

Concretely:

| ❌ Wrong | ✅ Right |
|---|---|
| Send image to Gemini → "There are about 40 buildings covering 2 hectares" | Gemini returns bounding boxes → our code counts them and computes area from geometry → "41 buildings, 2.13 ha" |
| Ask Gemini "how big is this lake?" | Segment water by NDWI threshold → vectorise → `ST_Area` in UTM |
| Let Gemini write "construction began in mid-2024" | Walk the scene stack forward → first date where the change persists across 3 observations → "first supported 9 June 2024" |

**Any code path where a model's prose becomes a displayed number is a bug.** There is an enforcement mechanism for this — the Number Verifier (see `architecture.md` §7). It is not optional.

---

## 3. Scope for this build

### 3.1 IN scope

**Group A — Area monitoring (SIH26227)**

| ID | Feature |
|---|---|
| A1 | AOI picker on a map; save named areas of interest |
| A2 | Ingest Sentinel-2 L2A scenes for an AOI; cloud-score and pick the best scene per month |
| A3 | Semantic search: free text → ranked image tiles ("newly built structures near a river") |
| A4 | Image-to-image search: "find tiles that look like this one" |
| A5 | Swipe comparison between any two dates |
| A6 | Timeline strip with per-date usability, and a play animation |
| A7 | Bi-temporal change detection producing polygons, not just a heatmap |
| A8 | Change classification into a fixed set of types, with a visible rule trace |
| A9 | False-alarm suppression — eight gates, each recording a human-readable reason |
| A10 | Deterministic measurement: area in m², centroid, bbox, perimeter |
| A11 | Onset dating: earliest observation supporting the change, with an uncertainty interval |
| A12 | Confidence score from five components, geometric mean, calibrated |
| A13 | Ranked analyst review queue; confirm / reject with a note |
| A14 | Append-only, hash-chained audit log |
| A15 | Provenance export: JSON manifest + PDF report |
| A16 | Incremental ingestion without a full index rebuild |

**Group B — Single image understanding (SIH26167)**

| ID | Feature |
|---|---|
| B1 | Upload a satellite image (GeoTIFF, PNG, JPEG) |
| B2 | Read and display its georeferencing, bands, resolution, and acquisition date if present |
| B3 | **Object detection with highlighting** — identify discrete objects (buildings, vehicles, aircraft, ships, storage tanks, pools, towers) and draw labelled boxes on the image |
| B4 | **Land-cover classification with highlighting** — classify pixels into cover classes (water, vegetation, built-up, bare, crop, snow) and draw labelled polygons |
| B5 | Single-image VQA — "what is in this image?", "how many buildings?", "is there a river?" |
| B6 | Image captioning — one factual paragraph describing the scene |
| B7 | Text-guided grounding — "show me the water" → highlight the water |
| B8 | Change questions on an uploaded image — "what changed here in 3 years?" — resolved by pairing the upload with archive scenes for the same location |
| B9 | Execution trace for every AI answer: which model, which tools, which inputs, which outputs |

**Group C — Shared**

| ID | Feature |
|---|---|
| C1 | Ask panel: free-text questions over either an AOI or an uploaded image |
| C2 | Number Verifier: reject any model output containing an unverified figure |
| C3 | Deterministic intent router + templates that work with no network at all |
| C4 | Confidence and provenance attached to every answer |
| C5 | Downloadable report for any answer or any area |

### 3.2 OUT of scope — do not build these

If you find yourself implementing any of these, stop and re-read this section.

| Excluded | Why |
|---|---|
| Training or fine-tuning any model | No GPU, no labelled Indian data, no time. Pretrained weights and arithmetic only. |
| SAR / radar processing | SIH26167 asks for optical–SAR pairs. We do not have SAR data or the expertise in this window. **Declare this gap in the submission rather than faking it.** |
| User accounts, roles, permissions, multi-tenancy | Single-user demo. A hardcoded `analyst_id` is enough. |
| Real-time or streaming ingestion | Batch jobs only. |
| Mobile app or responsive polish beyond "doesn't break on a small screen" | Desktop demo. |
| A vector database other than pgvector | Postgres already does this. Adding Redis/Milvus/MinIO is forbidden. |
| A Node backend | FastAPI is the only backend. |
| Payment, billing, analytics, telemetry SDKs | None. |
| Custom map tile rendering from scratch | Use MapLibre with an existing tile source. |
| Full agentic multi-step planning (ReAct loops, tool-choice models) | Tier-1 router + Tier-2 Gemini only. See `architecture.md` §7. |
| Internationalisation | English only. |
| 3D / terrain / elevation analysis | Not required by either PS. |

### 3.3 Explicitly deferred (nice-to-have, only if everything above works)

- HDBSCAN clustering of similar tiles into a discovery view
- Severity ranking of changes (Critical / High / Medium / Low)
- Natural-language spatial filters ("within 2 km of the highway")
- A third demo site
- PDF export (JSON export is mandatory; PDF is deferred)

---

## 4. The two hard constraints that shape everything

### Constraint 1 — Resolution determines what is even possible

A Sentinel-2 pixel is **10 m × 10 m = 100 m²**. A car is ~4 m long. **You cannot detect a car in Sentinel-2.** Anyone who claims otherwise is hallucinating.

This produces a hard gate:

| Ground sample distance | What we can honestly detect |
|---|---|
| ≤ 1 m (aerial, Cartosat-2S, WorldView) | Individual buildings, vehicles, aircraft, ships, tanks, pools |
| 1–5 m (Sentinel-2 pan-sharpened, Landsat) | Building blocks, roads, field boundaries, large vehicles |
| 10 m (Sentinel-2 multispectral) | Land-cover classes, large structures, water bodies, cleared areas |
| > 10 m | Land-cover classes only |

**Every detection feature must read the image's actual GSD and refuse, with a clear message, to promise more than that resolution supports.** See `feature-specs.md` §B3 and §B4.

If an uploaded PNG has no georeferencing and therefore no reliable GSD, the user must either supply it or the system must state the assumption explicitly in the UI and in the trace. **Never silently assume a resolution.**

### Constraint 2 — The finale must run offline

The internal hackathon allows cloud APIs. The MoD finale requires the demo to run **with the network disabled**.

Therefore: **every feature must have a no-network path.** Gemini improves phrasing; the deterministic router and templates must produce a complete, correct, useful answer without it. Build both from the start, not one then the other.

Practical test: there is an `OFFLINE=1` environment flag. When set, no HTTP call leaves the machine. The test suite must include a run with `OFFLINE=1` that passes.

---

## 5. Demo sites

All development, tuning, and demoing happens against these. Do not pick others without changing this file.

| Site | Why | Expected changes |
|---|---|---|
| **Noida International Airport, Jewar, UP** (~28.13°N, 77.76°E) | Massive, well-documented greenfield construction on former farmland. Public timeline available for validation. | Farmland → airport infrastructure, 2021–2026 |
| **Bhadla Solar Park, Rajasthan** (~27.58°N, 71.92°E) | Enormous, high-contrast, arid — minimal cloud and minimal vegetation confusion | Panel array expansion, year over year |
| **A reservoir** (pick one with visible seasonal swing, e.g. Bhakra or a Karnataka reservoir) | Exercises the water-extent change type and the seasonal suppression gate | Water gain/loss, seasonal and structural |

Sites 1 and 2 are mandatory. Site 3 is P1.

---

## 6. Users

| Persona | Wants | Gets |
|---|---|---|
| **Imagery analyst** (primary) | A short, ranked list of things worth looking at, with evidence | Review queue, evidence triptych, confirm/reject |
| **Non-specialist officer** | To ask a question in plain language and get a straight answer | Ask panel, plain-language responses, highlighted map regions |
| **Reviewer / auditor** (later, downstream) | To reconstruct how a conclusion was reached | Audit log, provenance export, execution trace |

There is no consumer user. Do not design for delight; design for **trust and throughput**.

---

## 7. Success criteria

The build is done when all of the following are demonstrable:

1. A judge picks a prepared AOI and sees two dates, with a working swipe.
2. Pressing **Analyse** produces real change polygons from real Sentinel-2 data, with measured areas.
3. Each polygon shows a change type **and the rule that produced it**.
4. A suppression counter shows how many candidates were discarded and why, by category.
5. Clicking a polygon shows before / mask / after side by side.
6. Confidence is broken into five visible components, with a calibration chart behind it.
7. Typing *"what changed here in the last 3 years?"* returns a ranked summary with dates and areas, and highlights the relevant polygons on the map.
8. Uploading a satellite image produces labelled, highlighted detections — and **refuses or downgrades gracefully** when the resolution does not support what was asked.
9. Every AI answer can be expanded to show its execution trace.
10. Confirming and rejecting changes writes to an append-only audit log; exporting produces a manifest with source scene IDs and checksums.
11. `OFFLINE=1` and the whole thing still works.
12. `EVALUATION_REPORT.md` and `MODEL_PROVENANCE.md` exist and contain real measured numbers.

---

## 8. The pitch, in one paragraph

> Chakshu is an evidence-first satellite analysis platform. You draw an area or upload an image, ask a question in plain English, and it shows you what is there and what changed — as highlighted polygons on a map, with measured areas, dated onsets, and the before/after imagery behind every claim. Two things make it different. First, the AI is never allowed to produce a number: language models understand your question and phrase the answer, but every measurement comes from deterministic geospatial code, and a verifier rejects any response containing a figure it cannot trace to the database. Second, it tells you what it threw away and why — hundreds of false alarms suppressed by eight explicit gates, each with a recorded reason — because in intelligence work, precision matters more than recall. It runs on open data, on CPU, entirely on-premise, with the network unplugged.

---

## 9. Where to go next

- **How it is structured** → `architecture.md`
- **Exactly what each feature must do** → `feature-specs.md`
- **Exact shapes of data on the wire** → `data-contracts.md`
- **How to write the code** → `code-standards.md`
- **How to work through the build** → `ai-workflow-rules.md` then `build-order.md`
