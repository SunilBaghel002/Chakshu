# PRD Pack — Chakshu

**7 files that tell Claude Code exactly what to build and how to behave while building it.**

~23,800 words. Written to be read literally, not skimmed.

---

## Setup — do this before anything else

Copy the whole `prd/` folder into the root of your new code repository, then:

```bash
# in the new repo root
cp -r /path/to/earthlens-research/prd ./prd
cp prd/CLAUDE.md ./CLAUDE.md      # Claude Code reads CLAUDE.md from the repo root automatically
touch PROGRESS.md                 # ai-workflow-rules.md §6 defines its format
```

⚠️ **Two references will break after the copy.** `feature-specs.md` (lines 9 and 34) and `build-order.md` (line 5) point at `../docs/03-SOLUTION-AND-APPROACH.md` and `../docs/05-BUILD-PLAN-4-DAYS.md`, which live in the research folder, not the code repo. Either copy `earthlens-research/docs/` in alongside `prd/`, or change those three references to note the file is external. Nothing else depends on them — Group A features are fully summarised in `feature-specs.md` itself.

---

## The files

| # | File | What it is for | Read |
|---|---|---|---|
| — | [`CLAUDE.md`](CLAUDE.md) | **Entry point.** Goes at the repo root. Claude Code loads it automatically. Points at the other seven and states the three rules that matter most. | 2 min |
| 1 | [`project-overview.md`](project-overview.md) | What we're building, what's in scope, **what is explicitly out of scope**, the two hard constraints, demo sites, success criteria | 9 min |
| 2 | [`architecture.md`](architecture.md) | System diagram, layering rules, full repo layout, DB schema (runnable DDL), **the Resolution Gate**, the three detection tracks, **the three-tier answer stack and the Number Verifier**, cross-cutting concerns, ADRs | 20 min |
| 3 | [`feature-specs.md`](feature-specs.md) | Every feature with an ID, priority, processing steps, **testable acceptance criteria as checkboxes**, edge cases, and verbatim user-facing error messages. Group B (the new SIH26167 work) is specified in full. | 20 min |
| 4 | [`data-contracts.md`](data-contracts.md) | Exact JSON for Evidence, Upload, DetectionSet, ChangeSummary, Answer. Every enum. Every endpoint. Every error code. The full fixture list. **§7 on the Gemini bbox convention is the highest-risk detail in the project.** | 13 min |
| 5 | [`code-standards.md`](code-standards.md) | Pinned versions, ruff/mypy/tsconfig settings, naming, the domain vocabulary, testing rules, git, dependency gate, upload security, **§15 never-do list** | 11 min |
| 6 | **[`ai-workflow-rules.md`](ai-workflow-rules.md)** | **How Claude Code must behave.** The cardinal rules, the task protocol, the self-review checklist, the `PROGRESS.md` handoff format, the remote-sensing traps that will bite you, and the five-part test a judge should be able to apply at any moment. | 13 min |
| 7 | [`build-order.md`](build-order.md) | Phases 0–7, task by task, each phase ending in a **gate that must pass before the next one starts**. Dependency graph, critical path, cut order, task sizing. | 12 min |

---

## How the pack is meant to be used

`ai-workflow-rules.md` is the one that does the heavy lifting for your stated goal — *"explain the AI properly what changes and how the changes it has to make."* The other six say **what** to build; that file says **how to behave while building it**, which is where AI coding assistants actually go wrong.

The three rules it enforces, which appear consistently across all seven files:

1. **The AI never produces a number.** Architecture enforces it structurally (three-tier stack + verifier), the contracts enforce it in the schema (`narrative_facts`, `MeasurementBundle`, `kind: MEASURED | INFERRED`), the feature specs enforce it per feature, and the workflow rules make it a cardinal rule with a mandatory test.
2. **Refusals are features, not gaps.** The Resolution Gate, the `VISUAL_ONLY` upload refusal, the verifier fallback, and the `unsupported` intent all have verbatim messages in `feature-specs.md` and are protected by an explicit rule in `ai-workflow-rules.md` §2 Rule 8.
3. **Never weaken a guarantee to make progress.** No deleting tests, no `type: ignore`, no threshold tuned to make one demo case pass. `code-standards.md` §7 and `ai-workflow-rules.md` §2 Rule 7 both say this, in slightly different words, on purpose.

---

## What changed from the earlier `docs/` pack

Your new SIH26167 requirements — upload an image, have it categorised, labelled and highlighted, then ask what changed over three years — are not a bolt-on. They forced four real architectural changes:

| Change | Why |
|---|---|
| **Two ingestion paths** (archive batch vs. user upload) | An uploaded image has no guaranteed CRS, no guaranteed bands, and no guaranteed resolution. It cannot go through the same pipeline. |
| **The Resolution Gate** as a stored, first-class field | A 10 m Sentinel-2 pixel is 100 m². A car is 4 m. Detection capability has to be computed from the image's actual GSD and then govern everything downstream, or the model will confidently label cars in satellite imagery. |
| **Three detection tracks that may disagree** | Index-based land cover and WorldCover are trustworthy but coarse. Gemini boxes are detailed but unreliable. Keeping them separate preserves per-label provenance and lets the UI show solid vs. dashed outlines. |
| **`domain/merge.py`** — polygons into `change_object` entities over time | "What changed in 3 years" needs entities with lifespans and trends, not a pile of per-pair polygons. Consecutive-pair detection plus IoU-based merging. |

The one thing I'd flag as genuinely uncertain: **the Gemini bounding-box coordinate convention.** It has differed across model versions (0–1 vs 0–1000 normalisation, and `[ymin,xmin,ymax,xmax]` vs `[xmin,ymin,xmax,ymax]` ordering). I did not want to assert a value I can't verify, so `data-contracts.md` §7 specifies defensive auto-detection plus a mandatory synthetic-image test, and `build-order.md` puts that test in **Phase 0** rather than Phase 5 — because if the convention is wrong, everything built on top of it is wrong.
