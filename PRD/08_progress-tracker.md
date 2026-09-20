# PRD 8 — Progress Tracker

> **⚠ Status note, 20 Sep 2026.** Phase 8 Stage A (tasks 8.0–8.22) now exists in `build-order.md`.
> It supersedes the Next.js assumptions in `Prompts.md` — see `05_code-standards.md` §1.1–§1.4 and
> `17_build-guide.md`. **Phase 7 is deferred until the Phase 8 Stage-A gate passes.**

> **Audience:** Claude Code and every human on the team.
> **Status:** Authoritative for *state*. `build-order.md` is authoritative for *plan*. When they disagree, this file wins — it describes what is actually true.
> **Depends on:** `build-order.md`, `ai-workflow-rules.md` §6

---

## What this file is

`build-order.md` says what should happen. This file says **what has happened, what is true right now, and what we learned**.

It exists because a four-day build with six people and an AI assistant loses context constantly — between sessions, between people, and across context compaction. Without a single live state file, the same mistake gets made three times and the same question gets asked five times.

**There are two artefacts, and they are different:**

| | `prd/progress-tracker.md` | `PROGRESS.md` (repo root) |
|---|---|---|
| What | This specification: the format, the rules, the section definitions | The live instance, filled in as work happens |
| Changes | Rarely — only if the format changes | After every single task |
| Copied into the repo | Yes, as part of `prd/` | Created from the template in §4 |

On setup: `cp prd/progress-tracker-template-section PROGRESS.md` — or simply create `PROGRESS.md` at the repo root using the §4 skeleton.

---

## 1. The five laws of this file

**Law 1 — Never delete.** Move an entry to a later section, or mark it superseded with a date and a reason. History is the entire value of the file.

**Law 2 — Every claim carries its evidence.** Not "A2 done" but "A2 done — 36 scenes for Jewar, verified by `make test` + manual count". An unverifiable status entry is worse than no entry, because it creates false confidence.

**Law 3 — Negative results are recorded with the same prominence as positive ones.** §8 exists specifically for this. A detector that failed, a model that did not transfer, a demo site with no visible change — these are findings that go into `EVALUATION_REPORT.md` and often into the pitch.

**Law 4 — Every tuned number gets a date, a site, and a before/after.** §7. An undocumented threshold cannot be reviewed, cannot be reverted, and cannot be defended to a judge who asks "why 0.11?"

**Law 5 — Update it at the end of the task, not at the end of the day.** A task is not complete until this file reflects it. See `ai-workflow-rules.md` §3 step 9.

---

## 2. Status vocabulary

Use exactly these tokens. Nothing else.

| Token | Meaning | Requirement to use it |
|---|---|---|
| `todo` | Not started | — |
| `wip` | Started, not finished | Must state which layers are done: `domain ✓ service ✓ api ✗ ui ✗` |
| `blocked` | Cannot proceed | Must have an entry in §5 naming the blocker and who can unblock it |
| `done` | Complete | `make check` passes **and** every acceptance criterion in `feature-specs.md` is met **and** the verification method is recorded |
| `verified` | Done, and independently confirmed | Someone other than the implementer reproduced it, or a golden test locks it |
| `cut` | Deliberately dropped | Must reference the cut-order rank in `build-order.md` and state what the demo loses |
| `superseded` | Replaced by a later decision | Must point at the replacing entry |

**`done` and `verified` are different.** Conflating them is how a team discovers on demo day that three "finished" features were never tested against the real API.

---

## 3. Section definitions

### §A Current phase
One line. Which phase from `build-order.md`, and whether its gate has passed.

### §B Gate log
Every phase gate from `build-order.md`, with its pass/fail status, the date, and **the specific evidence for each checkbox that mattered.** A gate that failed and was retried gets two entries — do not overwrite the failure.

This is the most important section for the human lead. It is the honest answer to "are we actually on track?"

### §C Completed
Feature ID, name, date, verification method. Newest at the bottom.

### §D In progress
Feature ID, layer status, who owns it, what's left. **Maximum three entries.** If there are more than three things in progress, nothing is in progress — the team is context-switching.

### §E Blocked / needs human decision
The blocker, when it started, what has been tried, and **the specific question that would unblock it.** Not "Gemini is broken" but "the §7 bbox verification test returns boxes transposed from the documented convention for `gemini-2.x-flash`; `domain/bbox.py` currently assumes `xyxy`; confirm before B3 UI work starts."

Anything in this section for more than four hours goes to the whole team, not just the owner.

### §F Known gaps (deliberate)
Things that are incomplete *on purpose*, with the reason. This is what stops a well-meaning teammate or a fresh AI session from "helpfully" finishing something that was consciously deferred.

### §G Tuned values
Every threshold, with: initial value and its source, current value, date changed, site it was tuned on, and what broke before the change.

### §H Negative results
What was tried, what happened, the measured evidence, and the conclusion. These feed `EVALUATION_REPORT.md` and the pitch.

### §I Measured numbers
Every figure that might appear on a slide or in a report, with its measurement method and date. **If a number is not in this section, it may not be used in any document, slide, or claim.** That is a hard rule and it is what keeps the team honest.

### §J Decisions log
Architecture or scope decisions made after Phase 0, with the date, the decision, the alternative rejected, and why. `architecture.md` §10 is the initial ADR table; this section continues it.

### §K Next actions
The next three tasks in priority order, each with its owner and its blocking dependency. Rewritten at every standup.

---

## 4. The `PROGRESS.md` skeleton

Create this file at the repo root in Phase 0, task 0.13.

```markdown
# PROGRESS — Chakshu

> Live state. Updated at the end of every task. Format specified in `prd/progress-tracker.md`.
> Never delete an entry. Every claim carries its evidence.

Last updated: 2026-09-13 14:20 IST by <name or "claude-code">

## A. Current phase
Phase 0 — Skeleton and contracts. Gate: not yet run.

## B. Gate log
| Phase | Gate | Result | Date | Evidence |
|---|---|---|---|---|
| 0 | Skeleton and contracts | — | — | — |
| 1 | Data in | — | — | — |
| 2 | Change detection vertical slice | — | — | — |
| 3 | Trust | — | — | — |
| 4 | Retrieval | — | — | — |
| 5 | Upload and detection | — | — | — |
| 6 | Question layer | — | — | — |
| 7 | Release | — | — | — |

## C. Completed
<!-- feature-id — name — date — verification method -->

## D. In progress
<!-- max 3. feature-id — layers done — owner — what's left -->

## E. Blocked / needs human decision
<!-- blocker — since — tried — the specific question that unblocks it -->

## F. Known gaps (deliberate)
<!-- gap — reason — what would close it -->

## G. Tuned values
| Constant | Initial | Current | Changed | Tuned on | Why |
|---|---|---|---|---|---|
| `NDWI_WATER_THRESHOLD` | 0.15 (literature) | 0.15 | — | — | — |
| `NDVI_VEGETATION_THRESHOLD` | 0.40 (literature) | 0.40 | — | — | — |
| `NDBI_BUILT_THRESHOLD` | 0.05 (literature) | 0.05 | — | — | — |
| `DETECTION_SCORE_MIN` | 0.50 (assumption) | 0.50 | — | — | untested — no labelled object data |
| `MERGE_IOU_THRESHOLD` | 0.30 (assumption) | 0.30 | — | — | — |
| `INTENT_MATCH_THRESHOLD` | 0.72 (assumption) | 0.72 | — | — | — |
| `OTSU` | computed per tile pair | — | — | — | not a constant by design |

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

## K. Next actions
1. —
2. —
3. —
```

---

## 5. Update protocol

At the end of every task, in this order:

1. Set `Last updated` — timestamp and who.
2. Move the task in §D to §C, or add it to §C if it was never in §D. **Include the verification method.**
3. If anything is now blocked, add it to §E with the specific unblocking question.
4. If a threshold changed, add or update its row in §G. **No exceptions.**
5. If something failed or was abandoned, add it to §H.
6. If anything was measured, add it to §I.
7. If a design or scope decision was made, add it to §J and update the relevant PRD file in the same commit.
8. Rewrite §K to the next three actions.
9. If a phase gate was run, record it in §B — **pass or fail.**
10. Commit `PROGRESS.md` with the code, in the same commit. Never separately, never later.

**A task whose commit does not touch `PROGRESS.md` is an incomplete task.**

---

## 6. Anti-patterns

| ❌ | Why it's wrong | ✅ |
|---|---|---|
| `A7 done` | No evidence. Unfalsifiable. | `A7 done — 2026-09-14 — 6 polygons on Jewar, visually confirmed against before/after imagery, `make check` green` |
| Overwriting a failed gate with a later pass | Destroys the record of what went wrong | Two rows in §B |
| Deleting a superseded tuned value | Nobody can revert or explain the change | Keep the old value in the `Initial` column with its source |
| `various bug fixes` | Tells the next session nothing | One entry per bug, with its regression test name |
| Numbers in a slide that aren't in §I | Unsourceable claim. This is how a team gets caught fabricating. | Add to §I first, then use it |
| §D with seven entries | Nothing is actually in progress | Cap at three; the rest move to §K |
| Filling §I from an estimate | An estimate is not a measurement | Leave the cell `—` and record the target |

---

## 7. Reading this file at the start of a session

Before writing any code:

1. Read §A — what phase are we in?
2. Read §E — is anything blocked that I'm about to depend on?
3. Read §F — am I about to "helpfully" build something that was deliberately deferred?
4. Read §H — has someone already tried what I'm about to try?
5. Read §G — are the thresholds I'm about to use the tuned ones or the initial ones?
6. Read §K — what are the next three actions, and is mine one of them?

**Step 4 is the one that saves the most time.** A negative result recorded in §H is a task that does not need repeating.
