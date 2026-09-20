# PRD 12 — User Experience Rules (X)

> **Status:** Authoritative. Where this file and `ui-context.md` / `ui-console.md` overlap on appearance, those win; where they overlap on *behaviour and flow*, this file wins.
> **Work-item IDs:** `X1`–`X9`.
> **Premise:** the judges are domain people with four minutes per team. The UX goal is not delight — it is that a stranger understands what this does, believes the numbers, and never waits without knowing why.

---

## 1. The five UX laws (X1)

1. **No dead click.** Every visible control does something or explains why it cannot (§ `ui-controls.md` 1.5). A control that silently does nothing is worse than no control.
2. **No unexplained wait.** Any operation over 200 ms shows state; over 2 s shows *what stage it is in*; over 10 s shows an escape (`CANCEL`) and keeps working in the background.
3. **No hidden state change.** If the system changed something, say so where the user is looking, and offer `UNDO` for anything destructive.
4. **No number without a source.** Every figure on screen is traceable to `MEASURED`, `INFERRED` or `UNVERIFIED`, and every refusal states what is missing. This is a credibility rule that happens to be a UX rule.
5. **No mode the user cannot exit.** `Esc` closes overlays, `G …` navigates, `?` lists every shortcut. A lost user always has a way out that does not involve reloading.

---

## 2. Latency budget (X2)

Measured, not hoped for. Anything missing its budget is a bug with an ID.

| Interaction | Budget p50 | Budget p95 | What the user sees if it misses |
|---|---|---|---|
| Hover → reticle follows cursor | ≤ 16 ms | ≤ 33 ms | — (frame drop; fix, don't hide) |
| Hover polygon → lock-on tag | ≤ 100 ms | ≤ 160 ms | skeleton tag |
| Click nav tab → content painted | ≤ 120 ms | ≤ 250 ms | skeleton in SLOT-20 |
| Pan/zoom → tiles | ≤ 200 ms | ≤ 600 ms | `--panel-2` tile placeholders, never a spinner over the map |
| AOI change → stats refresh | ≤ 300 ms | ≤ 800 ms | stat values dim to `--ink-3` while stale, with a 2 px signal top edge |
| `DETECT CHANGES` → first visual feedback | ≤ 150 ms | ≤ 300 ms | button enters `loading`, SLOT-30 shows stage 1 |
| Full change analysis (demo AOI) | — | ≤ 45 s | honest stage progress + `CANCEL` after 10 s |
| `ASK` → streamed first token | ≤ 900 ms | ≤ 2.5 s | `THINKING` state with the tier badge (`ROUTER` / `VLM`) |
| Upload 20 MB GeoTIFF → manifest | ≤ 3 s | ≤ 8 s | progress with bytes read |
| Landing page LCP | ≤ 1.2 s | ≤ 2.5 s | — (see `landing-page.md`) |

**Rule:** the perceived-latency trick that is *banned* is a fake progress bar. The one that is *required* is showing the real stage name.

---

## 3. First-run (X3)

A judge lands on `/` and clicks `OPEN CONSOLE`. They must be productive in under 30 seconds without reading anything.

1. **No signup wall.** An anonymous session is created silently on first request (S1). The console opens immediately.
2. **Pre-loaded demo AOI.** The console always opens with the Koderi/demo AOI, dates A/B set, and the last detection already computed. Cold-open on an empty map is a UX failure.
3. **Three-step spotlight tour** (dismissible, shown once per session, `localStorage` + server flag):
   - `1 · PICK DATES` → points at SLOT-02, `COMPARE ANY TWO PASSES`
   - `2 · HOVER A CHANGE` → points at the map, `EVERY TARGET LOCKS ON WITH ITS MEASUREMENTS`
   - `3 · CONFIRM OR REJECT` → points at SLOT-25, `YOUR DECISIONS ARE AUDITED`
   Each step: `NEXT` primary (28 px), `SKIP TOUR` ghost left, `1/3` counter right. Overlay scrim `rgba(6,8,10,.55)` with the target cut out at `--z-modal`.
4. **Persistent shortcut hint** in SLOT-40: `PRESS ? FOR KEYS` — 10 px mono, `--ink-3`, fades out after 20 s of activity, returns on idle.

---

## 4. Empty, loading, error, refusal (X4)

Five states are mandatory for every data-bearing region. Copy is verbatim; it lives in `lib/copy.ts` and matches `feature-specs.md`.

| State | Treatment | Example copy |
|---|---|---|
| **Empty** | out-of-focus iris in `--line-strong` at 40% + one line + one action | `NO CHANGES DETECTED FOR THIS PAIR · TRY A WIDER DATE RANGE` + `WIDEN RANGE` secondary |
| **Loading** | skeleton wells + one scan sweep; never a spinner, never a percentage without a stage | `READING SCENE S2B_43RCU_20240609 …` |
| **Error** | 1 px `--danger` frame, code in `--t-mono`, copyable `trace_id`, `RETRY` secondary | `ANALYSIS FAILED · JOB_TIMEOUT · TRACE 9f2c…` |
| **Refusal / capability notice** | `--signal-wash` panel + aperture icon, **never red** | the verbatim resolution-gate copy from `feature-specs.md` B3 |
| **Stale** | value dimmed to `--ink-3` + 2 px signal top edge + `REFRESH` ghost | `SHOWING RESULT FROM 09:41 · AOI CHANGED` |

**Refusal is a first-class state, not an error.** A refusal rendered in red reads as "the system broke"; in signal-wash it reads as "the system is careful". This distinction is worth points with a domain judge.

---

## 5. Flows and step budgets (X5)

Counted clicks from a cold console. If a flow exceeds its budget, redesign it — do not document the excess.

| Flow | Budget | Path |
|---|---|---|
| See a change measurement | **2** | hover polygon → read lock-on tag |
| Compare two dates | **3** | date A → date B → `DETECT CHANGES` |
| Confirm a target | **3** | click row → review evidence → `CONFIRM` |
| Reject 5 targets | **6** | `J` ×5 with `⌫` ×5 (keyboard path beats mouse path) |
| Ask a question | **2** | click question bar → type + `⏎` |
| Upload and analyse | **3** | drop file → check manifest → `ANALYSE` |
| Export a report | **3** | `EXPORT` → choose format → `EXPORT` |
| Find what a shortcut does | **1** | `?` |

---

## 6. Keyboard map (X6)

Single source: `lib/shortcuts.ts`. `?` opens the full list as a dialog, grouped, with the same `--t-tag` styling as the buttons' `<kbd>` hints.

| Key | Action |
|---|---|
| `G` then `M` `F` `U` `R` `A` | go to Map / Search / Upload / Review / Audit |
| `A` | focus AOI selector · `P` presets · `S` swap · `D` detect |
| `1`–`6` | year chips · `J` `K` next/prev row · `⏎` confirm · `⌫` reject · `Space` peek |
| `B` toggle before/after · `C` copy id · `E` export · `L` toggle legend · `F` fit AOI |
| `Esc` close overlay · `?` shortcuts · `/` focus search/question |

**Rule:** shortcuts never fire while a text field has focus, except `Esc` and `⏎`. Every shortcut is also reachable by mouse — a keyboard-only path is a hidden feature.

---

## 7. Honesty rules (X7)

These exist because the shortcut is always available and always tempting (see `ai-workflow-rules.md` Rule 5).

1. Never animate, round, or count up a value that is not `MEASURED`.
2. Never show a confidence bar for an uncalibrated model — show the `UNCALIBRATED` iris.
3. Never hide suppressed candidates; `SUPPRESSED` is a tab with counts.
4. Never let a model's wording appear as a measurement; the Number Verifier owns all numbers.
5. Never show `100%` progress before the job finishes.
6. Never claim a date is "earliest construction" when it is an interval — render the interval band and the words `EARLIEST OBSERVED BETWEEN`.
7. If the demo is running on cached/precomputed results, say so in SLOT-40: `CACHED RESULT · RECOMPUTED 09:41`.

---

## 8. The 90-second judge path (X8)

Scripted, rehearsed, and the reason the layout is what it is. Each step names the slot the judge should be looking at.

| t | Say | On screen |
|---|---|---|
| 0:00 | "This is Chakshu — the eye that never blinks." | Landing hero (W) |
| 0:10 | "Everything runs on-prem, with the network off." | `OFFLINE` badge + status line |
| 0:20 | "Pick any two passes." | SLOT-02, click year chips 2021 / 2024 |
| 0:30 | "Hover a change — measurements, not adjectives." | SLOT-16 lock-on tag, count-up on `MEASURED` |
| 0:45 | "Some candidates are suppressed. Here's why." | SLOT-21 `SUPPRESSED` tab, reasons + counts |
| 1:00 | "The analyst decides, and the decision is audited." | SLOT-25 `CONFIRM` → SLOT-40 audit line |
| 1:15 | "Ask it a question in plain language." | SLOT-02 question bar, `⏎` |
| 1:25 | "Every number came from geometry. Here is the trace." | SLOT-21 `TRACE` tab |

Rehearse with the network physically off. If any step needs narration to be understood, the UI is wrong at that step — fix the UI, not the script.

---

## 9. Anti-patterns to remove from the current build (X9)

| Anti-pattern | Replacement |
|---|---|
| Modal dialogs for information the user should see in context | SLOT-20 dossier panel |
| Alerts (`window.alert`, `confirm`) | Dialog component (K9) |
| Red banners for capability limits | signal-wash refusal notice (X4) |
| Spinners over the map | tile placeholders + stage labels |
| Tooltips as the only documentation of an icon | labels, or `?` |
| Auto-playing carousels / looping counters | static until interacted |
| "Loading…" with no stage | stage names |
| Confirmation for reversible actions | do it, then `UNDO` in a toast |
| Confirmation dialogs for `CONFIRM`/`REJECT` | direct action + `UNDO`; only destructive-irreversible gets a dialog |
| Colour-only state encoding | border style as second channel (`ui-context.md` §5) |

---

## 10. Acceptance criteria

- [ ] All five flows in §5 meet their click budget (counted, recorded in `PROGRESS.md`)
- [ ] Every latency budget in §2 measured at p50/p95 on the demo machine and recorded in `progress-tracker.md` §I
- [ ] Five states implemented for every data-bearing region; screenshot contact sheet committed
- [ ] Refusals render in signal-wash, never red, with verbatim `feature-specs.md` copy
- [ ] No fake progress anywhere; every progress surface shows a real stage name
- [ ] `?` lists all shortcuts; no shortcut fires from a text field except `Esc`/`⏎`
- [ ] First run reaches a populated console with zero clicks and shows the 3-step tour once
- [ ] The §8 judge path runs end-to-end with the network disabled, in under 90 s, unaided
