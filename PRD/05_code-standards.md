# PRD 5 — Code Standards

> **Audience:** Claude Code and human developers.
> **Status:** Authoritative. `make check` enforces most of this. If the checker and this file disagree, fix the checker.
> **Depends on:** `architecture.md`

---

## 1. Languages and versions

| Component | Version | Notes |
|---|---|---|
| Python | 3.12 | `from __future__ import annotations` in every module |
| FastAPI | latest stable, pinned | |
| Pydantic | v2 | **Not v1.** No `class Config:`; use `model_config = ConfigDict(...)` |
| SQLAlchemy | 2.x | Mapped/mapped_column style only, no legacy `Column()` |
| NumPy | 2.x | |
| rasterio / GDAL | latest stable via conda-forge | Install with conda, never pip, on the first attempt |
| Node | 20 LTS | |
| Next.js | 15 | App Router |
| React | 19 | |
| TypeScript | 5.x, `strict: true` | |
| Postgres | 17 + PostGIS 3.4 + pgvector 0.8 | Docker only |
| Tailwind | 4 | |

> ⚠️ **Verify actual current versions with `pip index` / `npm view` before pinning.** Do not assume the versions above are still latest, and do not upgrade past them without a reason.

**Pinning rule:** `requirements.txt` and `package-lock.json` are committed and frozen. `make freeze` regenerates them. **Nobody edits them by hand.** Adding a dependency is a gated action — see §11.

---

## 2. Python

### Enforced by ruff (`backend/pyproject.toml`)

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E","F","W","I","N","UP","B","A","C4","SIM","RET","ARG","PTH","RUF","ANN","D"]
ignore = ["D203","D213","ANN401","ARG001","ARG002"]

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["D","ANN"]

[tool.mypy]
python_version = "3.12"
strict = true
plugins = ["pydantic.mypy"]
disallow_any_explicit = true
warn_unreachable = true
```

### Rules

1. **Full type annotations on every function signature**, including `-> None`. `mypy --strict` must pass.
2. **No `Any`.** Use `object` + narrowing, a `TypeVar`, or a concrete type. If a third-party library returns `Any`, wrap it in a typed adapter at the boundary and never let `Any` cross a module edge.
3. **Every public function and class gets a docstring**: one summary line, then Args/Returns/Raises where non-obvious. Private helpers (`_leading_underscore`) need a docstring only if the logic is non-obvious.
4. **No bare `except:`** and no `except Exception: pass`. Catch the specific exception. If you must catch broadly, log at `warning` with `exc_info=True` and re-raise or return a typed failure.
5. **Return typed failures, not `None`, for expected bad outcomes.** `def normalise_bbox(...) -> PixelBox | BboxReject` — never `PixelBox | None`. `None` means "no value"; a rejection means "here's why".
6. **Pure functions in `domain/`.** No I/O, no globals, no mutation of arguments, no clock reads. Everything needed is passed in. If a domain function needs the current time, take it as a parameter — this is what makes onset dating testable.
7. **numpy discipline:** no Python loops over pixels. Vectorise. If a loop is unavoidable, comment why.
8. **Explicit `dtype` and `nodata` handling on every raster read.** Never assume float32. Sentinel-2 L2A is uint16 with a 10000 scale factor — **divide by 10000.0 before computing indices, and check for the nodata value first.** Getting this wrong silently produces plausible-looking garbage.
9. **No magic numbers.** Thresholds live in `domain/constants.py` with a comment stating the source or the tuning run that produced it.
10. **f-strings only**, no `%` or `.format()`.
11. **`pathlib.Path`**, never string paths.
12. **No `print()`.** Use the module logger.

### Logging

```python
import logging

log = logging.getLogger(__name__)
```

One logger per module, named `__name__`. Structured context via `extra={...}`, never f-string interpolation into the message for values you might want to query. Levels: `debug` for per-pixel/per-box detail, `info` for job milestones, `warning` for degraded paths (verifier failure, model unavailable, tier refusal), `error` for caught exceptions with `exc_info=True`. **A verifier rejection is a `warning`, not an `error` — it is the system working.**

---

## 3. TypeScript / Frontend

`tsconfig.json`: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`.

1. **No `any`. No `as` casts** except when narrowing from `unknown` after a runtime check. ESLint enforces both.
2. **Validate at the boundary.** Every API response goes through a zod schema in `lib/api.ts` before it reaches a component. `lib/types.ts` is generated from OpenAPI; zod schemas are hand-written to match and cross-checked by a test.
3. **`fetch` appears in exactly one file** — `lib/api.ts`. Components import typed functions.
4. **Server components by default.** Add `"use client"` only where there is genuine interactivity (the map, the slider, the ask panel).
5. **No business logic in components.** A component receives data and renders it. Computation lives in `lib/`.
6. **No hardcoded strings in JSX.** All user-facing copy goes in `lib/copy.ts`. This is what makes the verbatim error messages in `feature-specs.md` auditable in one place.
7. **Colours from `lib/palette.ts` only.** Per-class colours are a fixed map. Never generate colours at runtime, never let a model choose one.
8. **Handle three states in every data component:** loading, empty, error. **Empty is not error.** A "no changes found" state with an explanation is a complete UI.
9. **Null means unknown.** Render `—`. Never render `0` for a null area. Add a test for this.
10. **Images:** always `next/image` or an explicit `<img>` with `width`/`height`. Never let an unsized image cause layout shift.
11. **Accessibility:** the map needs keyboard operability for the review queue; every button has an accessible name; colour is never the only signal (paired with a label or icon).

---

## 4. Naming

| Thing | Convention | Example |
|---|---|---|
| Python module | `snake_case`, singular | `change_classical.py` |
| Python class | `PascalCase` | `ChangeObject` |
| Python function/var | `snake_case` | `first_supported_date` |
| Constant | `UPPER_SNAKE` | `NDVI_VEGETATION_THRESHOLD` |
| TS/React component file | `PascalCase.tsx` | `EvidencePanel.tsx` |
| TS function/var | `camelCase` | `fetchChanges` |
| DB table | `snake_case`, singular | `change_object` |
| DB column | `snake_case` | `first_supported` |
| API route | kebab-free, plural nouns | `/api/v1/uploads` |
| Env var | `UPPER_SNAKE` | `GEMINI_MODEL` |
| Git branch | `type/short-desc` | `feat/b3-object-detection` |
| Test file | `test_<module>.py` | `test_bbox.py` |
| Test function | `test_<behaviour>` | `test_rejects_bbox_outside_image` |

**Domain vocabulary — use these words exactly, everywhere.** Inconsistent naming between the DB, the API, and the UI is a real source of bugs.

`aoi` · `scene` · `tile` · `change_object` · `detection` · `upload` · `evidence` · `rule_trace` · `suppression` · `onset` · `capability_tier` · `measurement_bundle` · `narrative_fact` · `trace`

Never: `feature`, `item`, `thing`, `object` (bare), `data`, `result`, `stuff`, `temp`, `new`.

---

## 5. File and function size

| Limit | Action when exceeded |
|---|---|
| 400 lines per file | Split by responsibility. Not by arbitrary line count. |
| 60 lines per function | Extract a named helper. The name is the documentation. |
| 5 parameters | Introduce a dataclass / Pydantic model. |
| Nesting depth 4 | Early-return or extract. |
| 200 lines per React component | Extract subcomponents. |

These are enforced by ruff (`C901` complexity) and by review, not silently ignored.

---

## 6. Error handling

**Backend:** every route is wrapped by middleware that converts exceptions to the §8 envelope from `data-contracts.md`. Domain errors are typed exceptions in `app/exceptions.py`:

```python
class ChakshuError(Exception):
    code: str
    http_status: int
    user_message: str


class ResolutionInsufficient(ChakshuError): ...


class NotGeoreferenced(ChakshuError): ...


class FileUnreadable(ChakshuError): ...


class NoUsableScenes(ChakshuError): ...


class OfflineError(ChakshuError): ...
```

Raise the specific error. Never raise a bare `ValueError` from a service or API layer. **Never catch `ChakshuError` and convert it to a 500.**

**Frontend:** `lib/api.ts` maps error codes to typed results. Components switch on `result.kind`: `"ok" | "capability_notice" | "empty" | "error"`. A `capability_notice` renders as an informative panel, not a red error box.

---

## 7. Testing

| Layer | Framework | Scope | Must not touch |
|---|---|---|---|
| `tests/unit/` | pytest | `domain/` only | DB, network, filesystem (except `tests/fixtures/`) |
| `tests/integration/` | pytest | `services/` + `api/` | network (mocked adapters) |
| `tests/golden/` | pytest | exact API JSON | — |
| `frontend/tests/` | vitest + testing-library | components against fixtures | real API |
| `tests/e2e/` | Playwright | the demo script | — (P1) |

### Non-negotiable rules

1. **Never weaken, skip, or delete a test to make it pass.** If a test is wrong, fix the test in a separate commit with a message explaining why it was wrong. This is the single most common way an AI assistant silently destroys a project's guarantees.
2. **Every bug fix gets a regression test first.** Write the failing test, watch it fail, then fix.
3. **`domain/` has near-total coverage.** These are pure functions; there is no excuse. Target ≥ 90%.
4. **Golden files are reviewed diffs.** When a golden file changes, read the diff. If you cannot explain every changed line, do not commit it.
5. **No test may make a network call.** Gemini is always mocked in tests via a recorded-response fixture in `tests/fixtures/gemini/`.
6. **Deterministic tests.** Seed every RNG. No `time.now()` in a test — inject the clock.
7. **Tests that must exist** (write these even if nothing else gets tested):
   - `test_verifier_rejects_fabricated_number`
   - `test_verifier_accepts_unit_conversion` (18.43 ha ↔ 184320.5 m²)
   - `test_count_comes_from_db_not_model_prose`
   - `test_normalise_bbox_roundtrip_on_synthetic_image`
   - `test_tier_blocks_vehicle_detection_at_10m`
   - `test_area_m2_is_null_when_gsd_assumed`
   - `test_visual_only_upload_refuses_temporal_query`
   - `test_ungeoreferenced_upload_has_null_bounds`
   - `test_suppressed_candidate_always_has_a_reason`
   - `test_confidence_geometric_mean_one_bad_component_sinks_score`
   - `test_audit_chain_detects_tampering`
   - `test_offline_mode_makes_no_http_calls`
   - `test_incremental_ingest_does_not_rebuild_index`

### Running

```bash
make check      # everything: lint, types, unit, integration, golden, frontend, purity, audit
make test       # pytest only
make test-fast  # unit only, no DB
make offline    # pytest -m offline with OFFLINE=1
```

**Run `make check` before declaring any task complete.** Not `pytest`. All of it.

---

## 8. Architecture purity check

`make check` includes a script asserting:

- No module under `backend/app/domain/` imports `fastapi`, `starlette`, `sqlalchemy`, `httpx`, `boto3`, `google`, `requests`, or `app.settings`
- No module under `backend/app/` outside `api/` imports `fastapi.Request` or `fastapi.Depends`
- `frontend/src/` outside `lib/api.ts` contains no `fetch(`
- `frontend/src/lib/types.ts` is unchanged from the generated output (`make types` then `git diff --exit-code`)
- No file exceeds the §5 size limits

Failing this check is a build failure, not a warning.

---

## 9. Git

**Branch:** one per feature ID — `feat/b3-object-detection`, `fix/a9-cloud-gate`. Never commit to `main` directly except for docs.

**Commits:** Conventional Commits, imperative mood, ≤ 72 char subject.

```
feat(b3): reject object labels not permitted at the capability tier

A 10 m Sentinel-2 image cannot support vehicle detection. Track 3 now
drops any model label outside the tier's permitted set and records the
rejection in the trace, so the refusal is inspectable rather than silent.

Refs: prd/feature-specs.md §B3
```

Reference the PRD section in the body whenever the change implements a spec. **One logical change per commit.** A commit that touches backend, frontend, and tests for one feature is fine; a commit that implements two features is not.

**Never commit:** `.env`, `data/`, `*.tif`, `*.png` over 100 KB, model weights, `__pycache__`, `node_modules`. `.gitignore` covers these — verify it before the first commit.

**Never:** `git push --force` to a shared branch, `git commit --amend` a pushed commit, or `git reset --hard` without checking `git status` first.

---

## 10. Secrets and configuration

- All secrets in `.env`, which is gitignored. `.env.example` is committed with every variable present and a comment explaining it, and placeholder values only.
- **Never** a secret in source, a fixture, a test, a commit message, or a log line.
- Add a pre-commit check that greps for patterns resembling API keys.
- `settings.py` is the only module that reads environment variables. Everything else receives config by injection.

---

## 11. Dependencies — gated action

**Adding any dependency requires, in order:**

1. Check whether the standard library or an existing dependency already does it.
2. Check the **licence**. Permissive (MIT, BSD, Apache-2.0) is fine. **Copyleft (GPL, AGPL) is forbidden** in this project — it would contaminate a government deployment. Non-commercial (CC BY-NC) is forbidden for anything shipped. Unknown or custom licences require a human decision.
3. Check the last release date and open issue count. Abandoned packages are a liability.
4. Record it in `MODEL_PROVENANCE.md` (models/weights) or `DEPENDENCIES.md` (libraries) with name, version, source URL, and licence.
5. **Ask the human before installing.** Do not install speculatively "to see if it works."

**Forbidden additions** (already decided, do not re-litigate): Redis, Celery, RQ, MinIO, Milvus, Qdrant, Pinecone, Elasticsearch, Kafka, RabbitMQ, MongoDB, a second database, any MLflow/W&B/telemetry SDK, any UI kit heavier than Tailwind + Radix.

---

## 12. Upload security

User-supplied files are untrusted input. Enforce:

1. Extension allow-list **and** magic-byte verification (via `filetype` or manual header check). Both must agree.
2. Size limits enforced on `Content-Length` **before** buffering, and again on the written file.
3. Store under a server-generated UUID directory. Never use the client filename in a path. Sanitise the stored display name (`Path.name`, strip control characters, cap at 200 chars).
4. **Decompression-bomb check:** for GeoTIFF, compare declared dimensions against file size; reject if `width × height × bands × bytes_per_sample` exceeds 40× the compressed size.
5. Never execute, render server-side, or parse with an image library configured to follow external references. Disable SVG entirely (not in the allow-list).
6. Rasterio/GDAL: set `GDAL_DISABLE_READDIR_ON_OPEN=EMPTY_DIR` and `CPL_VSIL_CURL_ALLOWED_EXTENSIONS` to prevent remote-filesystem surprises from a crafted file.
7. Serve overviews and tiles from a route that sets `Content-Disposition: inline` and a strict `Content-Type`. Never serve the original upload bytes back to the browser.

---

## 13. Performance

- No N+1 queries. Use `selectinload` / explicit joins. A route that issues more than 5 queries is a bug.
- Raster reads use windowed access (`rasterio.windows`) — **never read a full COG into memory to use a crop of it.**
- Downscale before sending anything to Gemini. A 2048 px image costs more and is not more accurate than 1568 px.
- Cache derived artefacts on disk keyed by `sha256(inputs)`.
- The frontend must not re-fetch on every render. Use SWR/React Query with explicit keys.
- Map layers: never draw more than 500 polygons at once. Aggregate or paginate.

---

## 14. Documentation in code

- Every module gets a top docstring: what it does, what layer it's in, what it must not import.
- Every non-obvious algorithm gets a comment explaining **why**, not what. The code says what.
- Remote-sensing formulas cite their source in a comment (`# NDWI, McFeeters 1996`).
- When you tune a threshold, update the comment with the date, the site, and the value before/after.
- `PROGRESS.md` at the repo root is updated at the end of every task — see `ai-workflow-rules.md` §6.

---

## 15. Never do these

- ❌ Let a model's prose become a displayed number
- ❌ Return `null` as `0`
- ❌ Return an empty list where an explanatory `capability_notice` belongs
- ❌ Swallow an exception
- ❌ Weaken a test to make it pass
- ❌ Hardcode a demo-site coordinate in application code (fixtures and `stage_demo_sites.py` only)
- ❌ Add a dependency without the §11 gate
- ❌ Commit `.env`, imagery, or weights
- ❌ Call an external API from a code path marked offline-capable without checking `settings.OFFLINE`
- ❌ Assume a Gemini coordinate convention without the §7 verification test
- ❌ Write `# TODO: fix later` without a linked issue or a `PROGRESS.md` entry
- ❌ Refactor working code while implementing a feature — separate commits, separate PRs
- ❌ Delete or rename a field in a data contract without editing `data-contracts.md` first
