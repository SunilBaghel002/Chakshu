# PRD 3 — Feature Specifications

> **Audience:** Claude Code and human developers.
> **Status:** Authoritative. Each feature has testable acceptance criteria. If a criterion cannot be tested, it is not a criterion — rewrite it.
> **Depends on:** `project-overview.md`, `architecture.md`

**How to read a spec:** every feature has an ID, a priority (P0 = demo fails without it, P1 = demo is weaker, P2 = deferred), inputs, numbered processing steps, outputs, acceptance criteria as checkboxes, edge cases, and verbatim user-facing error messages. **Use the error messages exactly as written.** They were chosen to be honest about limits, which is a scoring criterion.

Group A features (area monitoring) are summarised here and specified in depth in `../docs/03-SOLUTION-AND-APPROACH.md`. Group B features (the new SIH26167 single-image work) are specified in full below, because they are new and carry the most design risk.

---

# Group A — Area monitoring (summary)

| ID | P | Feature | Acceptance criterion (abridged) |
|---|---|---|---|
| A1 | P0 | AOI picker | Draw/select a polygon; it persists; UTM zone derived and stored once |
| A2 | P0 | Scene ingestion | ≥ 40 usable monthly scenes 2021–2026 for a demo site; idempotent re-run adds only new months |
| A3 | P0 | Semantic search | "newly built structures near a river" returns ranked tiles; filters applied **inside** the SQL, not after |
| A4 | P1 | Image-to-image search | Clicking "find similar" returns visually comparable tiles |
| A5 | P0 | Swipe compare | Slider wipes between two dates at the same AOI, georegistered |
| A6 | P0 | Timeline | One dot per scene; usable vs unusable visually distinct; PLAY animates through |
| A7 | P0 | Change detection | Real polygons from real scenes, not a heatmap. ≥ 1 polygon on each demo site |
| A8 | P0 | Change classification | Every polygon has a `change_type` and a non-empty `rule_trace` |
| A9 | P0 | Suppression | Eight gates; every discarded candidate has a reason; the panel shows counts by reason |
| A10 | P0 | Measurement | `area_m2` computed in UTM from the vectorised polygon; matches `ST_Area` to 0.1% |
| A11 | P1 | Onset dating | `first_supported` + `onset_interval` + `onset_gaps`; validated against a published construction date for a demo site |
| A12 | P0 | Confidence | Five components, geometric mean; a calibration curve exists from ≥ 100 hand-labelled polygons |
| A13 | P0 | Review queue | Ranked by severity×confidence; confirm/reject with optional note |
| A14 | P0 | Audit log | Append-only, hash-chained; trigger blocks UPDATE/DELETE; `make verify-audit` passes |
| A15 | P0 | Provenance export | JSON manifest with scene IDs, checksums, model versions, licences, processing history |
| A16 | P1 | Incremental ingest | Adding 63 tiles requires **no** index rebuild; a counter in the UI shows this |

Full detail for A1–A16: `../docs/03-SOLUTION-AND-APPROACH.md`.

---

# Group B — Single image understanding (new)

## B1 — Image upload

**Priority: P0** · **PS: SIH26167 mandatory (single-image analysis)**

**User story:** *As an analyst, I have a satellite image on my laptop — a GeoTIFF from a vendor, or a screenshot from Google Earth — and I want to drop it into Chakshu and have it tell me what's in it.*

### Inputs
- Multipart file upload
- Optional form fields: `gsd_m` (float), `acquired_at` (date), `title` (string), `notes` (string)

### Accepted formats

| Extension | Max size | Notes |
|---|---|---|
| `.tif` `.tiff` | 500 MB | GeoTIFF or COG. May have CRS, transform, nodata, band names, acquisition metadata |
| `.png` `.jpg` `.jpeg` `.webp` | 25 MB | Treated as 3-band RGB, no CRS unless the user supplies coordinates |

### Processing

1. **Reject before parsing.** Check extension against the allow-list. Check `Content-Length` against the limit. Check magic bytes match the declared extension. Reject with `415` or `413` before opening the file.
2. Stream to `data/uploads/{uuid}/{original_filename}`. Never trust the client filename for the path — sanitise it, and store the original separately in the DB.
3. Compute `sha256` of the stored file.
4. Open with `rasterio`. Read: `width`, `height`, `count` (bands), `dtypes`, `crs`, `transform`, `bounds`, `nodata`, `tags()`.
5. **Band identification.** Map bands to semantic names using, in priority order: (a) `rasterio` band descriptions, (b) the Sentinel-2 / Landsat filename convention, (c) a `bands` field the user supplied, (d) heuristic by count and wavelength metadata. Record which method was used. If bands cannot be identified, `bands = ['red','green','blue']` for 3-band images and `[]` with a note otherwise.
6. **CRS and bounds.** If `crs` is present and `bounds` are finite → `status = GEOREFERENCED`, compute `bounds_4326` by reprojection. Else → `status = VISUAL_ONLY`.
7. **GSD resolution.** In priority order:
   - from the affine transform: `gsd_m = sqrt(abs(transform.a * transform.e))`, reprojected to metres if the CRS is geographic
   - from the user-supplied `gsd_m` field → `gsd_source = 'user_declared'`
   - from the sensor name if recognisable (Sentinel-2 → 10, Landsat → 30, Cartosat-2S → 0.65) → `gsd_source = 'metadata'`
   - otherwise `gsd_m = NULL`, `gsd_source = NULL`
   **Never default to an assumed value silently.** If the UI needs a working assumption to render anything, it must be shown as `gsd_source = 'assumed'` and labelled as such everywhere it appears.
8. **Acquisition date.** From metadata (`ACQUISITIONDATE`, `datetime`, `TIFFTAG_DATETIME`, or the Sentinel-2 filename) → `acquired_source = 'metadata'`. Else from the user field → `'user_declared'`. Else `NULL`.
9. **AOI match.** If georeferenced, find any `aoi` whose geometry intersects or comes within 5 km of `bounds_4326`. Set `aoi_id`. If none, leave null — this is normal and not an error.
10. **Capability tier.** `resolve_tier(gsd_m, gsd_source)` → store `capability_tier`.
11. **Overview generation.** Write a max-2048-px JPEG overview to `data/uploads/{uuid}/overview.jpg` for display. The UI must never load the full-resolution file.
12. Trigger detection tracks asynchronously (B3/B4). Return `202` with the `upload` row immediately.

### Outputs
`Upload` object per `data-contracts.md` §4, plus `job_id` for the detection run.

### Acceptance criteria
- [ ] A 3-band georeferenced GeoTIFF uploads and lands as `GEOREFERENCED` with correct `bounds_4326` (verify against `gdalinfo` on the same file)
- [ ] A plain PNG screenshot lands as `VISUAL_ONLY`, with `crs_epsg`, `bounds_4326`, `area_m2` all null
- [ ] `gsd_source` is correct in each of the four cases in step 7
- [ ] A 600 MB GeoTIFF is rejected with `413` and a clear message **before** it is fully written to disk
- [ ] A `.png` renamed to `.tif` is rejected with `415`
- [ ] A `.zip` / `.exe` / `.html` upload is rejected with `415`
- [ ] Uploading the same file twice produces two distinct upload rows (no dedup) but the second is served from cache for detection
- [ ] The overview JPEG renders in the browser in under 1 s
- [ ] No path traversal is possible via the filename (`../../etc/passwd` must be sanitised)
- [ ] The upload appears in a "Recent uploads" list in the UI

### Edge cases and messages (verbatim)

| Case | Message |
|---|---|
| Unsupported type | *"That file type isn't supported. Chakshu reads GeoTIFF (.tif) and plain images (.png, .jpg, .webp)."* |
| Too large | *"That file is 812 MB. The limit is 500 MB for GeoTIFF. Try cropping to your area of interest first."* |
| Corrupt / unreadable | *"I couldn't read this file — it may be corrupt or use a compression I don't support. Try re-exporting it as an uncompressed GeoTIFF."* |
| No georeferencing | *"This image has no location information, so I can describe and label what's in it, but I can't place it on a map or compare it against the satellite archive. If you know where it is, add the coordinates and I'll do the full analysis."* |
| No GSD, no CRS | *"I don't know this image's resolution. I'll describe it qualitatively. Tell me the ground sample distance in metres and I can identify specific objects and measure their sizes."* |
| Zero-band / empty raster | *"This image contains no pixel data."* |

---

## B2 — Image metadata panel

**Priority: P0** · cheap to build, high credibility payoff

Shows, for the selected upload: filename, size, checksum (truncated, copyable), dimensions, band count and names, CRS and EPSG, bounds, GSD **and its source**, acquisition date **and its source**, capability tier and what that tier permits, matched AOI.

### Acceptance criteria
- [ ] Every field in `data-contracts.md` §4 is displayed or explicitly shown as "not available"
- [ ] `gsd_source` and `acquired_source` are visibly labelled — e.g. *"10 m (from metadata)"* vs *"10 m (you declared this)"* vs *"resolution unknown"*
- [ ] The capability tier shows its permitted object classes and land-cover classes as chips
- [ ] Where a value is null, the UI shows an em dash, never `0`, `null`, or `NaN`

**This panel is where you prove to a judge that the system knows what it does not know. Do not skip it.**

---

## B3 — Object detection, labelling and highlighting

**Priority: P0** · **PS: SIH26167 mandatory (single-image VQA + text-guided grounding)**

**User story:** *As a non-specialist, I upload an image and ask "what's in here?" I want to see the objects named, boxed, and counted.*

### Inputs
An `upload` row. Its `capability_tier` decides everything.

### Processing

1. **Gate.** If `capability_tier == 'T0_UNKNOWN'` or the tier's `object_classes` list is empty → **do not run Track 3.** Emit only land-cover detections (B4), and set a `capability_notice` on the response explaining what was and wasn't attempted. Return `200`, not an error — a partial answer is a good answer.
2. Run Track 3 exactly as `architecture.md` §6.3 specifies: downscale → Gemini → validate every box → NMS → convert to pixel geometry → optionally to 4326 and m².
3. Run Track 1 and/or Track 2 (B4) in parallel.
4. **Label normalisation.** Map the model's free-text label onto the canonical class list via an explicit alias table stored in `domain/bbox.py`:

   | Canonical | Accepted aliases |
   |---|---|
   | `building` | house, structure, residential building, commercial building, edifice |
   | `building_cluster` | buildings, urban area, settlement, built-up area, town |
   | `vehicle` | car, truck, bus, van, automobile |
   | `aircraft` | airplane, plane, jet, airliner |
   | `ship` | boat, vessel, ship, barge, ferry |
   | `ship_large` | large vessel, cargo ship, container ship |
   | `storage_tank` | oil tank, water tank, fuel tank, silo |
   | `swimming_pool` | pool |
   | `tower` | pylon, antenna, mast, communications tower, minaret |
   | `container` | shipping container, container stack |
   | `road` | road, highway, street, runway, taxiway, path |

   Store both `label` (canonical) and `label_raw` (what the model said). **A label with no alias match is rejected**, not passed through. Add new aliases only by editing this table, never dynamically.
5. **Attach measurements.** For each surviving detection, compute `area_px` always; `area_m2` only when `gsd_source` is `metadata` or `user_declared`. When `gsd_source == 'assumed'`, `area_m2 = NULL` and the UI shows the pixel area with a note.
6. Persist all `detection` rows, including rejected candidates, to a `detection_rejected` log table or to the trace. **Rejections must be inspectable** — they are how you debug the model and how you demonstrate rigour.
7. Return the `DetectionSet`.

### Rendering (frontend)

- Boxes drawn on a `<canvas>` overlaying the image, in image pixel space, scaled to the displayed size.
- Each box: 2 px stroke, colour from a fixed per-class palette (define once in `frontend/src/lib/palette.ts` — do not let the model or a random generator choose colours).
- Label chip anchored at the box's top-left, outside the box if it fits: `building · 0.87`.
- **Detections from Track 3 render with a dashed border. Detections from Tracks 1 and 2 render solid.** The legend must explain: *solid = measured from the pixels, dashed = identified by a model*.
- Hover a box → highlight the matching row in the side list, and vice versa.
- Click a box → open a detail card: class, score, score source, area, verified flag, and the model's `reason` if present.
- A "show all / hide by class" filter row above the list.
- Overlapping boxes must remain individually clickable — do not let a large box swallow small ones. Render small boxes on top; hit-test smallest-first.

### Acceptance criteria
- [ ] A 0.65 m aerial image of an airport produces `aircraft`, `building`, and `road` detections with boxes that visually land on the right things
- [ ] A 10 m Sentinel-2 image **does not** produce `vehicle` or `aircraft` detections — the tier forbids them and the alias/reject step enforces it
- [ ] A `VISUAL_ONLY` PNG produces land-cover detections but no `area_m2` values anywhere in the response
- [ ] Boxes returned with coordinates outside `[0, 1000]`, or with `x1 >= x2`, are rejected and the rejection is visible in the trace
- [ ] Two near-identical overlapping boxes (IoU > 0.5) collapse to one
- [ ] The displayed count for any class equals `SELECT count(*) FROM detection WHERE upload_id=? AND label=?` — tested, not assumed
- [ ] A model response containing prose instead of JSON is handled: retry once, then fall back to Tracks 1/2 with a `capability_notice`
- [ ] With `GEMINI_ENABLED=0`, B3 degrades to land-cover only and says so, without erroring
- [ ] Box colours are stable across reloads (fixed palette, keyed by canonical class)
- [ ] Detection results for an unchanged file are served from cache on the second request (< 300 ms)

### The resolution refusal — verbatim

When a user asks for something the tier cannot support:

> **T3 (10 m):** *"This image is 10 m per pixel — that's Sentinel-2. At this scale one pixel covers 100 m², so I can't identify individual vehicles or aircraft; they're smaller than a pixel. What I can show you: building clusters, large ships, storage tanks, roads, and land cover. Here's what I found."*

> **T0 (unknown):** *"I don't know this image's resolution, so I can't safely identify specific object types or measure sizes — a 10 m satellite pixel and a 30 cm drone pixel look similar when you can't see the scale. Tell me the ground sample distance and I'll do the full analysis. For now, here's a qualitative description."*

**Never** silently return an empty list. An empty list with no explanation reads as a broken system; an empty list with an explanation reads as a rigorous one.

---

## B4 — Land-cover classification and highlighting

**Priority: P0** · **PS: SIH26167 (captioning / grounding)**

Runs Track 1 (`landcover_index`) when NIR+SWIR are available, and Track 2 (`landcover_worldcover`) when the image is georeferenced. Full algorithm in `architecture.md` §6.

### Rendering
Polygons (not boxes) filled at 35% opacity with the same fixed palette. Classes: `built`, `water`, `vegetation`, `bare`, `crop`, `snow`, `unclassified`. A coverage summary bar at the top: percentage of the image by class — **computed from pixel counts in SQL, never estimated by a model.**

### Acceptance criteria
- [ ] A Sentinel-2 scene over a reservoir labels the water body correctly and its area is within 5% of the value from Copernicus Browser for the same scene
- [ ] Track 1 produces no detections for an RGB-only PNG (no NIR) and says why
- [ ] Track 2 polygons align with the uploaded image when overlaid (verify visually on a georeferenced upload)
- [ ] Where Tracks 1 and 2 disagree, both rows exist and the trace records the disagreement
- [ ] Coverage percentages sum to 100% ± 0.5% including `unclassified`
- [ ] Threshold values used are read from a single constants module, not hardcoded inline
- [ ] The final tuned thresholds are written back into `architecture.md` §6.1 and `EVALUATION_REPORT.md`

---

## B5 — Single-image VQA

**Priority: P0** · **PS: SIH26167 mandatory**

Handles free-text questions about one uploaded image. Routes through the Tier-1 intent router (`architecture.md` §7).

### Supported question shapes

| Shape | Example | Handler |
|---|---|---|
| Inventory | "what's in this image" | aggregate all tracks → grouped counts + coverage |
| Count | "how many buildings" | `count(*)` on `detection` |
| Area | "how big is the lake" | `ST_Area` on the water polygons, UTM |
| Presence | "is there a river / airport / solar panel field" | boolean from class presence + geometry |
| Location | "where in the image is the water" | return pixel + geo polygons for map/canvas highlight |
| Comparative | "is there more vegetation than built-up area" | two SQL aggregates, compared in Python |
| Capability | "can you count the cars" | Resolution Gate answer, verbatim refusal |

### Acceptance criteria
- [ ] Each shape above is answered correctly on the fixture images in `tests/fixtures/`
- [ ] Every number in the answer appears in the `MeasurementBundle` and passes the verifier
- [ ] "How many buildings?" returns the DB count, and a unit test asserts the model's prose count is **not** used even when the model supplies one
- [ ] An out-of-scope question ("who owns this land?") routes to `unsupported` with the honest message, and does **not** reach Gemini
- [ ] A question about a class the tier forbids returns the capability refusal
- [ ] The answer includes a confidence value and a "why this answer" expandable showing the trace
- [ ] Latency under 500 ms for Tier 1

---

## B6 — Image captioning

**Priority: P1** · **PS: SIH26167 (captioning OR grounding — we do both)**

One factual paragraph. Built from a template over the MeasurementBundle, optionally polished by Gemini and verified.

**Template (this is the offline path and must be complete on its own):**

> *"A {gsd} m-resolution {sensor_or_'satellite'} image covering {area} near {place_or_'an unlocated area'}, acquired {date_or_'on an unknown date'}. Land cover is {top1}% {class1}, {top2}% {class2} and {top3}% {class3}. {n_obj} discrete objects were identified{obj_clause}. {water_clause}{veg_clause}{built_clause} {confidence_clause}"*

with, for example, `obj_clause = ", including 14 buildings and 3 storage tanks"` and `confidence_clause = "Land-cover figures are measured directly from the pixels; object counts come from a vision model and are marked unverified."`

### Acceptance criteria
- [ ] The caption contains **no** claim absent from the MeasurementBundle — tested by extracting every noun phrase and checking it against the bundle
- [ ] Undeclared metadata produces explicit "unknown" phrasing, never a guess
- [ ] The caption states which parts are measured and which are model-identified
- [ ] Reads as English, not as a template with holes — review by a human before demo

---

## B7 — Text-guided grounding

**Priority: P0** · **PS: SIH26167 mandatory**

"Show me X" → highlight X. Two implementation paths, tried in order:

1. **Structured path (preferred).** If X matches a known class or alias, resolve it to a SQL/geometry filter over stored detections or land-cover polygons. Exact, fast, offline, verifiable.
2. **Model path (fallback).** Otherwise, ask Gemini to return bounding boxes for X. Validate through `domain/bbox.py` exactly as in B3. Mark `verified = false`.

**Always try path 1 first.** Path 2 is for genuinely novel descriptions ("the thing that looks like a triangle").

### Acceptance criteria
- [ ] "Show me the water" highlights exactly the water polygons from Track 1/2, with no model call
- [ ] "Show me the buildings" uses stored detections when they exist
- [ ] The trace records which path was used and why
- [ ] A query with no matches returns *"I found no {X} in this image"* plus the list of classes that **are** present — never a blank map
- [ ] Highlighted regions are also listed with their measured areas
- [ ] The map/canvas pans and zooms to fit the highlighted regions

---

## B8 — Change questions on an uploaded image ("what changed in 3 years")

**Priority: P0** · **PS: both — this is the seam where SIH26167 meets SIH26227**

**User story:** *I upload an image of a place and ask "what changes took place in 3 years in this area?" Chakshu finds the archive for that location, analyses the window, and summarises it.*

### Three resolution states — handle each explicitly

**State 1: Georeferenced upload, matches an existing AOI.**
Use the AOI's ingested scene stack. The upload becomes the "now" endpoint if its acquisition date is later than the newest scene; otherwise it is an extra observation slotted into the stack by date.

**State 2: Georeferenced upload, no matching AOI.**
Offer to create one: *"This image is near {place}. I don't have archive data here yet. Analyse the last 3 years? (This downloads ~36 satellite scenes and takes about 4 minutes.)"* On confirmation, run A2 ingestion for a 5 km buffer around the image bounds, then proceed as State 1. This is a background job with progress.

**State 3: `VISUAL_ONLY` upload.**
Temporal analysis is **impossible** — there is no location to look up an archive for. Do not attempt it. Respond:

> *"This image has no location information, so I can't look up its history — I'd be guessing at where it is. Give me its coordinates, or pick the area on the map, and I'll pull three years of satellite archive and tell you exactly what changed."*

Then offer the map picker inline. **This refusal is a feature. Do not soften it.**

### Processing (States 1 and 2)

1. Resolve the window: `[to_date - N years, to_date]` where `N` comes from the question (default 3) and `to_date` is the upload's acquisition date, or the newest scene, or today.
2. Select usable scenes in the window. Record unusable ones with reasons and any gaps.
3. Run change detection over **consecutive usable pairs**, not just first-vs-last. Consecutive-only loses intermediate changes; first-vs-last only loses the timeline.
4. **Merge polygons into `change_object` entities** (`domain/merge.py`):

   ```
   sort all detections chronologically
   for each detection d in order:
     find an open change_object c where
        IoU(c.geom_at_previous_observation, d.geom) >= 0.3
        AND c.change_type == d.change_type
        AND d.scene_date - c.last_seen <= 2 × median scene interval
     if found:  append to c.area_series, update c.geom, c.last_seen, c.area_m2
     else:      open a new change_object
   close any change_object not seen in the last 2 observations
   ```

   Each `change_object` gets: `first_supported`, `last_seen`, `area_series` (list of `{date, area_m2}`), `area_m2` (latest), `max_area_m2`, `trend` (`expanding` | `contracting` | `stable` | `appeared` | `disappeared`).
5. Aggregate per `change_type`: count, total net area, earliest onset, latest onset.
6. Build the `ChangeSummary` object (`data-contracts.md` §5) including a `narrative_facts` list — atomic, individually-verifiable statements such as:
   ```
   {"fact_id":"f1","kind":"count","value":6,"unit":"changes","type":"construction"}
   {"fact_id":"f2","kind":"area","value":184320.5,"unit":"m2","type":"construction","label":"18.4 ha"}
   {"fact_id":"f3","kind":"onset","value":"2024-06-09","type":"earliest_construction"}
   {"fact_id":"f4","kind":"gap","value":["2024-06-01","2024-09-30"],"reason":"monsoon cloud"}
   {"fact_id":"f5","kind":"suppressed","value":312,"unit":"candidates"}
   ```
   **The verifier checks the final prose against these facts. Nothing else is quotable.**
7. Render via template; optionally polish with Gemini; verify.
8. Return the summary **plus** the `change_object` IDs so the frontend can highlight them on the map and open the review queue filtered to this window.

### Output example (template path, no network)

> **Changes in this area, 12 Sep 2023 → 12 Sep 2026**
>
> 36 satellite scenes analysed, 29 usable. Seven months unusable due to monsoon cloud cover — the longest gap is 1 Jun to 30 Sep 2024, so onsets inside that window are bracketed rather than exact.
>
> **Construction — 6 changes, 18.43 ha total**
> Earliest onset 9 Jun 2024 (absent 18 Jan 2024; bracketed to 143 days).
> Largest: 4.21 ha, expanding, still growing as of 3 Aug 2026.
>
> **Vegetation loss — 2 changes, 3.07 ha**
> Onset Mar 2025. NDVI fell 0.34 on land mapped as cropland in 2021.
>
> **Water extent — 1 change, −1.82 ha (contracting)**
> Seasonal. Suppressed 41 similar candidates as seasonal variation, not real change.
>
> **312 candidates were suppressed** and are not shown: 188 seasonal vegetation, 94 cloud shadow, 30 registration error. See the suppression panel for each reason.
>
> *Areas measured in UTM 43N from vectorised masks. Onset dates are the earliest observation supporting the change, not necessarily the true start date.*

### Acceptance criteria
- [ ] All three states are handled, with the verbatim State-3 refusal implemented and tested
- [ ] State 2 offers to ingest and shows real progress; the job is resumable if interrupted
- [ ] `N` is parsed from the question: "3 years", "last 3 years", "since 2022", "in the past 18 months" all resolve correctly
- [ ] Consecutive-pair analysis produces the same `change_object` set as an equivalent hand check on a demo site
- [ ] The merge algorithm's IoU and gap parameters are constants in one module and are covered by a unit test with synthetic polygons
- [ ] Every number in the summary is in `narrative_facts` and passes the verifier
- [ ] Unusable months and gaps are **always** disclosed in the summary, never omitted
- [ ] Suppressed candidate counts appear in the summary
- [ ] The summary's `change_object` IDs highlight correctly on the map
- [ ] Net area for a `disappeared` object is negative and labelled as a loss, not shown as a positive gain
- [ ] Works fully with `OFFLINE=1`

---

## B9 — Execution trace

**Priority: P0** · **PS: SIH26167 mandatory ("auditable execution trace")**

Every answer, detection run, and change analysis records a trace. Displayed in `TracePanel` as a collapsible tree.

### Must record
- Timestamp and `trace_id`
- The normalised question
- The matched intent and its similarity score
- The slots extracted, with the source of each
- The capability tier in force, with GSD and its source
- Every tool/model invoked: name, version, parameters, latency
- Every SQL statement executed (with values, not just the template)
- The MeasurementBundle, in full
- The raw model request and response, verbatim
- Every validation rejection, with its reason
- The verifier verdict and, on failure, the diff
- Which tier produced the final answer, and whether it was degraded

### Must NOT record
- Model chain-of-thought or internal reasoning (SIH26167 explicitly does not evaluate it, and logging it invites misuse)
- Anything that would let a number appear without provenance

### Acceptance criteria
- [ ] `GET /api/ask/{id}/trace` returns the complete tree as JSON
- [ ] Every field above is present, asserted by a golden-file test
- [ ] The trace is human-readable in the UI without horizontal scrolling
- [ ] A verifier failure is clearly visible in the trace with both the rejected prose and the template that replaced it
- [ ] Rejected detection boxes appear with their rejection reasons

---

# Group C — Shared

## C1 — Ask panel
Persistent right-hand panel. Works over either an AOI or an upload. Shows: the answer, a confidence chip, a "why this answer" expander (→ B9), the map/canvas regions the answer refers to (highlighted), and a "download this answer" button.

**Acceptance:** the panel is never empty — it always shows either an answer, an honest refusal, or a suggested question list.

## C2 — Number Verifier
Specified in `architecture.md` §7. **Acceptance:** a unit test feeds it prose containing a fabricated number alongside a correct MeasurementBundle and asserts `verdict == FAIL`; a test feeds correct prose and asserts `PASS`; a test feeds prose with a correct unit conversion (18.43 ha vs 184320.5 m²) and asserts `PASS`.

## C3 — Offline path
**Acceptance:** with `OFFLINE=1`, every feature in Groups A, B, C returns a complete answer or an explicit capability notice. `pytest -m offline` passes. **Demonstrate this live by unplugging the network.**

## C4 — Confidence and provenance on every answer
Every answer object carries `confidence` (0–1), `confidence_parts`, `sources` (scene IDs, upload IDs, model names and versions), and `degraded` (bool). The UI renders all four.

## C5 — Downloadable report
Per answer, per change object, per AOI, per upload. JSON always. PDF is P2. Contents: the answer, the MeasurementBundle, the trace, the sources with checksums, the model provenance, and a timestamp.

---

## Priority summary

**P0 — the demo fails without these:** A1 A2 A3 A5 A6 A7 A8 A9 A10 A12 A13 A14 A15 · B1 B2 B3 B4 B5 B7 B8 B9 · C1 C2 C3 C4 C5

**P1 — the demo is weaker:** A4 A11 A16 · B6

**P2 — deferred:** PDF export, clustering view, severity ranking, NL spatial filters, third demo site

When time runs short, cut P2, then P1. **Never cut a P0.** If a P0 is at risk, cut scope *within* it (one demo site instead of two; three change types instead of seven) rather than dropping it.
