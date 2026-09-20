# PRD 6 — AI Workflow Rules

> **Audience:** Claude Code, and any AI coding assistant working in this repository.
> **Status:** Authoritative and non-negotiable. These rules override your default instincts about being helpful, thorough, and proactive.
> **Read this file completely before writing any code.**

You are implementing a project with a hard deadline, a weak-ML team, no GPU, and a judge panel that will probe for exactly the places where a demo is faking it. The failure mode this project must avoid is not "too slow" — it is **"confidently wrong."** Every rule below exists to prevent that.

---

## 1. Read these first, in this order

Before touching code, read and internalise:

1. `prd/project-overview.md` — especially §2 (the AI never produces a number) and §3.2 (out of scope)
2. `prd/architecture.md` — especially §1 (layering rules), §5 (Resolution Gate), §7 (the three tiers and the verifier)
3. `prd/data-contracts.md` — especially §3 (Evidence), §4 (DetectionSet), §7 (bbox convention), §8 (error codes)
4. `prd/feature-specs.md` — the specific feature you are about to build
5. `prd/code-standards.md` — §7 (testing) and §15 (never do these)
6. `PROGRESS.md` — where the project currently stands

Then, and only then, look at `prd/build-order.md` and pick up the next unblocked task.

**If you have not read the PRD section for the feature you are implementing, you are not ready to implement it.** Go back.

---

## 2. The cardinal rules

### Rule 1 — Never fabricate

Do not invent:
- a library function, class, method, parameter, or return shape
- an API response format
- a benchmark number, accuracy figure, dataset size, or performance metric
- a file path, model checkpoint name, or dataset URL
- the contents of a file you have not read
- a coordinate convention

**If you are not certain something exists, check.** Read the installed package source, run `python -c "import x; help(x.y)"`, search the repo, or ask the human. Guessing an API and writing 200 lines against it is the single most expensive mistake you can make here, because it fails at runtime in a way that looks like a logic bug.

This applies with special force to: `rasterio`, `GDAL`, `open_clip`, `shapely` 2.x vs 1.x, `pydantic` v1 vs v2, `google-genai` vs `google.generativeai` (these are different SDKs with different APIs), and **MapLibre GL JS 5 vs Leaflet** — a full rewrite of `map-fx.ts` and `useMapPolygons.ts`, not a patch (`code-standards.md` §1.3).

### Rule 2 — The AI never produces a number

This is an architectural invariant, not a style preference. See `project-overview.md` §2.

Whenever you write code that could put a number on screen, trace its origin. If the chain passes through a language model's text output, **stop and redesign.** The correct pattern is always:

```
model → structured proposal → deterministic validation → deterministic measurement → display
```

Never:

```
model → prose → display
```

If you find yourself writing a prompt like *"return the area in hectares"*, you have already gone wrong. The prompt should be *"return bounding boxes"*; the area comes from geometry.

### Rule 3 — One feature at a time, vertically

Implement one feature ID end to end — domain function, service, route, schema, test, fixture, frontend component — before starting the next. Do not build all the domain functions first, then all the routes, then all the UI. That is how integration hell happens on day three.

**A feature is not started until its fixtures exist, and not finished until `make check` passes.**

### Rule 4 — Do not expand scope

`project-overview.md` §3.2 lists what is out of scope. Do not build any of it, even partially, even as a "quick win", even if it seems obviously useful. In particular:

- Do not add a second database, cache layer, queue, or worker system
- Do not train or fine-tune anything
- Do not add SAR processing
- Do not add authentication
- Do not build an agentic tool-calling loop
- Do not add a feature "because it's easy"

If you believe something out of scope is genuinely necessary, **stop and ask.** Do not implement it and mention it afterwards.

### Rule 5 — Ask when ambiguous; do not guess

Stop and ask the human when:
- two PRD sections conflict
- a spec is silent on something that changes the design
- a task requires a dependency not already in the lock file
- a data contract needs to change
- a test you believe is correct is failing and you cannot explain why
- you are about to change a threshold that was tuned on real data
- the honest implementation of a feature would produce a visibly worse demo than a shortcut

That last one matters most. **The shortcut is always available here** — let Gemini say "about 40 buildings", skip the verifier, assume a resolution, hide the suppressed candidates, tune thresholds until the demo looks perfect. Every one of these makes the demo better and the project worse, and a judge who knows the field will find it. **If you are tempted, surface the trade-off explicitly instead of making it silently.**

Do **not** ask about: things already answered in the PRDs, stylistic preferences covered by `code-standards.md`, or how to structure code within an assigned feature. Read first, ask second.

### Rule 6 — Verify before you claim

You may not say "done", "implemented", "working", or "fixed" unless you have run the relevant check and read its output. Specifically:

| Claim | Required evidence |
|---|---|
| "Implemented feature X" | `make check` passes; the X acceptance criteria in `feature-specs.md` are each demonstrably met |
| "Tests pass" | You ran `make test` and read the summary line |
| "It works offline" | You ran `make offline` and it passed |
| "Fixed the bug" | A regression test exists, failed before the fix, passes after |
| "The API returns X" | You called it and read the response |
| "Performance is fine" | You measured it and have the number |

**Never claim a benchmark, accuracy, or latency figure you did not measure.** If you have not measured it, say "not measured yet."

### Rule 7 — Never weaken a guarantee to make progress

Forbidden, without exception:
- deleting, skipping (`@pytest.mark.skip`), or loosening a test
- changing an assertion to match buggy output
- adding `# type: ignore` to silence mypy instead of fixing the type
- adding `noqa` to silence a lint rule instead of fixing the code
- casting to `Any` / `as any` to get past the type checker
- wrapping working code in `try/except` to hide a failure
- commenting out a failing block "for now"
- lowering a threshold so a demo case passes

If one of these seems like the only way forward, **the design is wrong or your understanding is wrong. Stop and ask.**

### Rule 8 — Preserve the honest-failure paths

This project has several places where the correct behaviour is to *refuse* or *degrade*:
- the Resolution Gate refusing to detect vehicles at 10 m
- the `VISUAL_ONLY` upload refusing a temporal query
- the verifier rejecting a fabricated number and falling back to a template
- the router returning `unsupported` rather than guessing
- the suppression panel showing what was thrown away

**These are features. They are the project's entire credibility.** Do not "improve" them by making them more permissive, more forgiving, or more likely to return something. Do not remove a refusal because it makes the demo awkward. If a refusal is firing when it shouldn't, fix the *gate condition*, never the *refusal*.

---

## 3. Task protocol

For every task:

**1. Announce.** State the feature ID, the PRD sections you are implementing, and the files you expect to create or change. One or two sentences.

**2. Check preconditions.** Are the dependencies in `build-order.md` actually complete? Read the relevant existing files. Do not assume their contents.

**3. Write fixtures first.** If the feature produces data the frontend consumes, write the fixture JSON matching `data-contracts.md` **before** writing the implementation. This forces the contract to be concrete and unblocks the frontend immediately.

**4. Write the failing test.** For domain logic especially. Watch it fail for the right reason.

**5. Implement.** Smallest thing that satisfies the acceptance criteria. No speculative generality, no config options nobody asked for, no abstraction for a single caller.

**6. Wire it up.** Service → route → schema → frontend.

**7. Run `make check`.** Read the full output. Fix everything it reports.

**8. Self-review** against the checklist in §5.

**9. Update `PROGRESS.md`.** See §6.

**10. Report.** What you built, what you verified, what you did not verify, and any deviation from spec with its reason.

---

## 4. Implementation order within a feature

Always bottom-up through the layers, because each layer is testable once the one below it exists:

```
domain/       pure function + unit tests
schemas/      Pydantic models matching data-contracts.md
db/           migration + model (only if the feature persists)
services/     orchestration + integration tests
api/          route + golden-file test
fixtures/     frontend fixture JSON
frontend      component against the fixture, then against the real API
```

**Never start at the UI.** A component built against an imagined API shape will be rewritten.

---

## 5. Self-review checklist

Run through this before reporting any task complete. If you cannot answer yes to an item, either fix it or report it as a known gap.

**Correctness**
- [ ] Every acceptance criterion for this feature in `feature-specs.md` is met
- [ ] No number on screen originates from a model's prose
- [ ] Nulls are preserved as nulls, never coerced to 0
- [ ] The Resolution Gate is consulted wherever detections or measurements are produced
- [ ] Verbatim user-facing messages match `feature-specs.md` exactly and live in `lib/copy.ts` / a constants module

**Honesty**
- [ ] Every refusal and degradation path is implemented and tested, not stubbed
- [ ] Suppressed/rejected items are recorded with reasons and are inspectable
- [ ] The execution trace records everything `feature-specs.md` §B9 requires
- [ ] No threshold is tuned to make one demo case pass without a comment recording where it came from

**Architecture**
- [ ] Layering rules respected (`architecture.md` §1); the purity check passes
- [ ] No new dependency added without the §11 gate
- [ ] No new top-level directory
- [ ] Data contracts match `data-contracts.md` byte-for-byte in shape; golden files reviewed

**Quality**
- [ ] `make check` passes, in full, and you read the output
- [ ] New tests exist and would fail if the feature were reverted
- [ ] No test was weakened, skipped, or deleted
- [ ] Type annotations complete; `mypy --strict` clean; no `Any`
- [ ] No file over the size limits
- [ ] No `print()`, no `TODO` without a `PROGRESS.md` entry

**Offline**
- [ ] The feature works, or degrades with an explicit notice, under `OFFLINE=1`
- [ ] No unguarded outbound HTTP call

---

## 6. `PROGRESS.md` — the handoff protocol

This file is how context survives between sessions. Update it at the end of **every** task, without being asked.

```markdown
# PROGRESS

## Current phase
Phase 3 — Change detection and classification

## Completed
- [x] A1 AOI picker — 2026-09-13 — verified: golden test + manual
- [x] A2 Scene ingestion — 2026-09-13 — verified: 36 scenes for Jewar, `make test`
- [x] B1 Image upload — 2026-09-14 — verified: all 10 acceptance criteria

## In progress
- [ ] A7 Change detection — domain/complete, service/in progress, api/not started

## Blocked / needs human decision
- Gemini bbox convention: the §7 verification test returns boxes transposed
  from what the docs describe. Current workaround in domain/bbox.py assumes
  "xyxy" for gemini-2.x-flash. NEEDS CONFIRMATION before B3 UI work.

## Known gaps (deliberate, with reason)
- A11 onset dating not yet validated against a published construction date
- TinyCD disabled: tested 2026-09-13 on a Jewar tile pair, produced 41 false
  positives and 0 true positives. Consistent with the expected domain gap.
  Left disabled; finding recorded for EVALUATION_REPORT.md.

## Tuned values (change these only with a recorded reason)
- NDWI water threshold: 0.15 (initial, from literature) → 0.11 (tuned 2026-09-14
  on Bhadla; 0.15 missed the shallow eastern pan)
- Otsu is computed per tile pair, not fixed
- DETECTION_SCORE_MIN: 0.5 (untested — no labelled object data)

## Measured numbers (for EVALUATION_REPORT.md)
- semantic search, 10 240 tiles: 84 ms p95
- change run, one tile pair, classical: 0.9 s
- ingest 63 tiles incremental: 41 s, no index rebuild
```

**Rules for this file:** never delete an entry, only update it. Record negative results — they are findings, not failures. Record every tuned threshold with its date and reason. Record every measured number, because a number you did not write down is a number you cannot put on a slide.

---

## 7. Working with the data

- **Real imagery lives in `data/`, which is gitignored.** Never commit it. Never reference an absolute path outside the repo.
- **Test fixtures are tiny crops**, ≤ 512×512, stored in `tests/fixtures/`. Commit those. Generate them with `scripts/make_fixtures.py` from the real data, and record the source scene ID and checksum in `tests/fixtures/README.md`.
- **Do not download data as a side effect of running tests.** Downloads happen only via `scripts/download_scenes.py`, invoked explicitly.
- **If a demo site has no visible change, say so immediately.** Do not tune the detector until something appears. That is fabricating a result. Report it and let the human choose a different site.

---

## 8. When something breaks

Diagnose in this order, and do not skip steps:

1. **Read the actual error.** Full traceback, not the last line.
2. **Reproduce minimally.** A failing unit test beats a failing demo.
3. **Check your assumptions about the data.** Print the array's `shape`, `dtype`, `min`, `max`, and `nodata`. Nine times out of ten a remote-sensing bug is: wrong dtype, unapplied scale factor (Sentinel-2 L2A needs `/10000`), nodata treated as zero, wrong band order, or a CRS mismatch (4326 where you assumed UTM).
4. **Check the environment**, not just the code. GDAL/rasterio version mismatches and a stale `.venv` cause failures that look like logic bugs.
5. **Only then change application logic.**

**Never fix a symptom by adding a special case.** If you write `if site == "jewar":`, stop.

**Never retry-and-hope.** A flaky test is a broken test. Find the nondeterminism (unseeded RNG, clock, dict ordering, filesystem ordering, network) and remove it.

---

## 9. Remote-sensing specifics that will bite you

These are the recurring traps. Check them proactively.

| Trap | Reality |
|---|---|
| Sentinel-2 L2A reflectance | Stored as `uint16` scaled by 10000. Divide by 10000.0. Forgetting this gives NDVI values in the thousands. |
| Nodata | Usually 0 in L2A, which is a *valid* reflectance. Mask it explicitly before any arithmetic, or your means are wrong. |
| Band order | Sentinel-2 is B02=blue, B03=green, B04=red, B08=NIR, B11=SWIR16. Not RGB order. NDVI is `(B08-B04)/(B08+B04)`. |
| SCL classes | 0 no-data, 1 saturated/defective, 2 dark area, 3 cloud shadow, 4 vegetation, 5 bare, 6 water, 7 unclassified, 8 cloud medium prob, 9 cloud high prob, 10 cirrus, 11 snow. **Exclude 0, 1, 3, 8, 9, 10, 11 for usable pixels.** |
| CRS | Store 4326, **measure in UTM**, display in 3857. `ST_Area` on a 4326 geometry returns degrees², which is meaningless. Always transform first. |
| UTM zone | Derive it once from the AOI centroid: `zone = floor((lon + 180) / 6) + 1`, hemisphere from the latitude sign. Store it. Do not recompute per call. |
| Y-axis | Raster pixel space is y-down. GeoJSON is y-up. Getting this wrong flips every bounding box vertically — the classic symptom is detections that appear mirrored. |
| GeoJSON coordinate order | `[lon, lat]`, not `[lat, lon]`. |
| Cloud shadow | Shadows are dark and look like new water or new construction. This is why the `cloud_shadow` suppression gate exists. Do not remove it to increase detection count. |
| Seasonality in India | Pre-monsoon (Mar–May) is brown and bare; post-monsoon (Oct–Nov) is green. Comparing March to October produces enormous fake "vegetation gain". This is what the `seasonal` gate is for. |
| Registration | Two Sentinel-2 scenes of the same tile are already co-registered to sub-pixel. Still run the phase-correlation check and record the shift — it is evidence, and it catches the case where someone uploaded a mis-projected file. |

---

## 10. Communication style

- Report what you did, what you verified, and what you did not verify. Three short sections.
- **Say "I don't know" when you don't.** It costs nothing and prevents a day of debugging.
- Surface trade-offs explicitly: "Option A is faster to build but cannot work offline; option B satisfies the offline constraint but needs a day more. Which do you want?"
- Do not pad a report with restated requirements.
- Do not apologise at length. Fix it and move on.
- If you made a mistake that cost time, say so plainly and note it in `PROGRESS.md` so it is not repeated.
- **Flag scope creep in yourself.** If you notice you have written 300 lines for a feature specced at 50, stop and re-read the spec.

---

## 11. The test you must never fail

At any point, a judge should be able to:

1. Pick any number displayed in the UI and ask "where did that come from?" — and get an answer, on screen, within two clicks.
2. Ask "what did you throw away?" — and see it, with reasons.
3. Ask "what happens if you're wrong?" — and see a confidence breakdown and a calibration curve.
4. Unplug the network — and watch the system keep working.
5. Upload an image at the wrong resolution for the question — and watch the system explain the limit instead of guessing.

**Every decision you make should be checked against this test.** If a change makes any of the five harder, it is the wrong change, however good the demo looks.
