# PRD 10 — Console Layout and Control Placement (L)

> **Status:** Authoritative. Extends `ui-context.md` (v3 · Sovereign Console) §4.
> **Scope:** *Where every element and every control goes*, on every screen. `ui-context.md` defines what things look like; this file defines where they live. Neither may be changed by inference.
> **Work-item IDs:** `L1`–`L9`. Slot IDs come from `ui-context.md` §4 and are reused verbatim here.
> **Authorised:** by user directive, 20 Sep 2026 — "the positioning of everything is bad… every button".

---

## 0. Why this file exists

The current build fails on placement, not on colour. Symptoms: controls floating over imagery, two things competing for "primary", numeric values drifting with their content, panels whose buttons move when the panel content changes height, and overlays that collide at small widths. Those are not taste problems; they are the absence of a placement rule. This file supplies one, per control.

**The three rules that fix it.** Everything below is an elaboration of these:

1. **Grid, not vibes.** A 4 px base grid, three fixed control heights (28 / 36 / 44), and fixed panel padding. Nothing is placed by eyeball.
2. **Zones, not scatter.** Every panel is exactly three zones — header, body, footer. Actions live *only* in the footer, right-aligned. Bodies never contain buttons except row-level ones.
3. **One primary per viewport.** Exactly one signal filled control may exist on screen at a time. If a second appears, one of them is not primary.

---

## 1. Spacing and sizing tokens (L1)

Add to `frontend/src/index.css` next to the colour tokens (Vite — see `code-standards.md` §1.1). **Arbitrary values are banned** — `p-[13px]`, `gap-[7px]`, `z-[999]` are lint errors.

| Token | Value | Use |
|---|---|---|
| `--s-0` | 2 px | hairline gaps between chip and its icon |
| `--s-1` | 4 px | base grid unit; icon-to-label gap |
| `--s-2` | 8 px | gap between sibling controls in a group |
| `--s-3` | 12 px | panel body padding (compact), gap between groups |
| `--s-4` | 16 px | panel body padding (standard), section gap |
| `--s-5` | 20 px | between dossier sections |
| `--s-6` | 24 px | screen-level gutter |
| `--s-8` | 32 px | landing-page section rhythm |
| `--h-ctl-sm` | 28 px | chips, year toggles, table row controls |
| `--h-ctl` | 36 px | **default** — every button, input, select, tab |
| `--h-ctl-lg` | 44 px | temporal-bar `DETECT`, landing CTAs, auth submit |
| `--hit-min` | 40 × 40 px | minimum pointer target, including padding/transparent hit area |
| `--icon-sm` | 14 px | inline with `--t-tag` / `--t-mono` |
| `--icon` | 16 px | default, inside `--h-ctl` |
| `--icon-lg` | 20 px | rail icons |
| `--r-ctl` | 4 px | controls |
| `--r-panel` | 4 px | panels (consoles are crisp, not rounded) |
| `--r-tag` | 2 px | chips and dossier tags |
| `--w-rail` | 56 px | SLOT-05 |
| `--w-dossier` | 380 px | SLOT-20 |
| `--pad-panel` | 12 px | compact panels (overlays) |
| `--pad-panel-lg` | 16 px | docked panels (dossier, drawer) |

**Rule:** a control's *visual* height comes from the token; its *hit area* may exceed it with transparent padding but never shrinks below `--hit-min` for anything clickable that is not inline text.

---

## 2. The z-index ladder (L2)

One ladder, named, in `frontend/src/index.css`. No number outside this table may appear in a `z-index`. The build currently uses `9999`, `550`, `500`, `450`, `400`, `350`, `300`, `299`, `200` — every one is a violation to be removed in task 8.1.

| Token | Value | Occupants |
|---|---|---|
| `--z-base` | 0 | page flow, panels |
| `--z-map-overlay` | 10 | SLOT-11…14, 17, 18 (map chrome) |
| `--z-reticle` | 20 | SLOT-15 cursor reticle, crosshair lines |
| `--z-locktag` | 24 | SLOT-16 target lock-on dossier tag |
| `--z-sticky` | 30 | SLOT-00, 01, 02, 40 (fixed bars) |
| `--z-drawer` | 40 | collapsed dossier rail, side drawers |
| `--z-modal` | 50 | dialogs, upload modal, confirm |
| `--z-toast` | 60 | toasts (bottom-right stack) |
| `--z-tooltip` | 70 | tooltips, always last |

**Collision rule:** an overlay in SLOT-11…14 may never cover more than 220 px of any edge, and never overlaps another overlay. The lock-on tag (24) may pass over the reticle (20) — that is the only sanctioned overlap.

---

## 3. Alignment rules (L3)

| What | Rule |
|---|---|
| Labels | Left-aligned, `--t-tag` uppercase mono, `--ink-3` |
| Values | Right-aligned, tabular numerals, `--ink` |
| Numeric columns | Right-aligned header *and* cell; fixed column widths so digits never reflow the table |
| Panel titles | Left, in the header zone, on the skewed dossier bar (`ui-context.md` §5) |
| Panel actions | Footer zone only, right-aligned; primary rightmost |
| Destructive actions | Left of the footer group, separated by `--s-3`, outline-only — never adjacent to primary |
| Icon-only controls | Permitted only in SLOT-05, SLOT-12, SLOT-40, and table row-actions. Everywhere else: icon + label |
| Text fields | Full panel width minus `--pad-panel-lg × 2`; never a magic pixel width |
| Dense panels | No centred text. Centre alignment is for landing-page hero and empty states only |
| Multi-line bodies | Header and footer are fixed-height; the body is the only scroll region (`overflow-y:auto`) |

**The reflow ban:** a panel's footer must not move when its body content changes. Footers are `position: sticky; bottom: 0` inside the panel with an opaque `--panel` background and a 1 px `--line` top border. This single rule removes most of the "everything jumps" feeling.

---

## 4. Control map — CONSOLE screen (L4)

Every control, its exact slot, position within the slot, size, variant, and keyboard shortcut. Variants are defined in `ui-controls.md` (K). If a control is not in this table, it does not exist.

### SLOT-00A · classification banner — 28 px, full width
No controls. Static, never animates. `ui-context.md` §5.7 · `--z-sticky`.

### SLOT-00 · data-stream marquee — 18 px, full width
No controls. Hover pauses (M8). `--z-sticky`.

### SLOT-01 · command bar — 56 px, full width

```
[lockup 200px][ AOI SELECTOR 240px ][ stat:area ][ stat:passes ]······[ nav tabs ][ session ][ LIVE ]
 ↑left pad 16            ↑gap 12                              ↑flex spacer      ↑right pad 16, gap 8
```

| # | Control | Position | Size | Variant | Shortcut | Notes |
|---|---|---|---|---|---|---|
| 01.1 | Iris lockup + `चक्षु (Chakshu)` + `MOD · ISRO` tag | left, pad `--s-4` | 200 × 32 | static | — | Not a link on the console; on landing it links to `/` |
| 01.2 | **AOI selector** | left of stats, gap `--s-3` | 240 × 36 | `select` (K4) | `A` | Shows AOI name + `UTM 43N` in `--t-mono` beneath on hover |
| 01.3 | `stat:area` | after selector, gap `--s-4` | auto × 36 | `stat` (K8) | — | label `AREA` over value `1,204.6 ha`, tabular |
| 01.4 | `stat:passes` | gap `--s-4` | auto × 36 | `stat` | — | label `CLEAR PASSES` over `14 / 22` |
| 01.5 | flex spacer | — | — | — | — | Pushes nav right. Never put a control in the spacer |
| 01.6 | Nav tabs `MAP` `REVIEW` `UPLOAD` `ASK` | right group, gap `--s-1` | 88 × 36 each | `tab` (K5) | `G` then `M/R/U/Q` | Active = signal underline from centre (M6) |
| 01.7 | Session chip | right, gap `--s-3` | auto × 28 | `chip` (K7) | — | `GUEST-7F3A` or user name; click → account menu (S3) |
| 01.8 | `LIVE API` indicator | far right, pad `--s-4` | auto × 28 | `status` (K8) | — | ion pulsing dot (M8). Amber `OFFLINE` when `offline=true` |

### SLOT-02 · temporal bar — 44 px, full width

```
row A: [DATE A ▾][year chips 2021 2022 2023 2024 2025 2026]······[presets ▾][SWAP][ DETECT CHANGES ]
row B: [DATE B ▾][year chips …]                                                              (44px total)
```

| # | Control | Position | Size | Variant | Shortcut |
|---|---|---|---|---|---|
| 02.1 | Date-A picker | left, pad `--s-4` | 168 × 36 | `input-date` (K4) | — |
| 02.2 | Year chips A (6) | right of picker, gap `--s-2` | 52 × 28 | `chip-toggle` (K7) | `1`–`6` |
| 02.3 | Date-B picker | row B, same left offset as 02.1 | 168 × 36 | `input-date` | — |
| 02.4 | Year chips B | aligned under 02.2 | 52 × 28 | `chip-toggle` | — |
| 02.5 | Presets menu (`LATEST`, `MAX GAP`, `PRE-MONSOON`, `CUSTOM`) | right group | 120 × 36 | `select` | `P` |
| 02.6 | `SWAP` (exchange A/B) | right of presets, gap `--s-2` | 84 × 36 | `secondary` (K1) | `S` |
| 02.7 | **`DETECT CHANGES`** | far right, pad `--s-4` | 176 × 36 | **`primary`** — the viewport's only primary | `D` |

**Positioning note:** 02.7 is rightmost because the eye ends its left-to-right scan there and because it is the action the bar exists for. `SWAP` sits immediately left of it so the two-step "fix the dates, then detect" flow never crosses the screen. 02.7 stays **pinned right at all widths**; the year chips are what collapses (into a `YEARS ▾` select below 1280 px).

### SLOT-05 · icon rail — 56 × main

| # | Control | Order top→bottom | Size | Shortcut |
|---|---|---|---|---|
| 05.1 | `MAP` | 1 | 40 × 40, icon 20 | `G M` |
| 05.2 | `SEARCH` | 2 | 40 × 40 | `G F` |
| 05.3 | `UPLOAD` | 3 | 40 × 40 | `G U` |
| 05.4 | `REVIEW` | 4 | 40 × 40 | `G R` |
| 05.5 | `AUDIT` | 5 | 40 × 40 | `G A` |
| 05.6 | divider | after 5 | 24 × 1, `--line` | — |
| 05.7 | `HELP / KEYS` | 6 | 40 × 40 | `?` |
| 05.8 | `SETTINGS` | 7 (bottom-anchored, `margin-top:auto`) | 40 × 40 | — |

Active = 3 px signal left bar + `--signal-wash` fill. Tooltips appear to the **right** of the rail (`--z-tooltip`), never left (off-screen). The rail never scrolls; if it needs to, there are too many items.

### SLOT-10 · map stage — flex

The imagery well. Contains no docked controls. Overlays only, at `--z-map-overlay`:

| # | Overlay | Corner / anchor | Max size | Collapsible |
|---|---|---|---|---|
| 11 | Sector tag `SEC 07 · E` | top-left, inset 12 | 220 × 24 | no |
| 12 | Zoom stack: `+` `−` `⌂ HOME` `⛶ FIT AOI` `📏 MEASURE` | top-right, inset 12, vertical, gap `--s-1` | 36 × 176 | no |
| 13 | Legend | bottom-left, inset 12 | 220 × auto | yes → 28 px bar `LEGEND ▸` |
| 14 | Coordinate readout `LAT 28.6139 · LON 77.2090 · Z 13.4` | bottom-right, inset 12 | 300 × 24 | no |
| 15 | Cursor reticle + crosshair | follows cursor | 30 × 30 | no (motion, M1) |
| 16 | Lock-on dossier tag | anchored to target bbox TL, offset −8/−8 | 220 × auto | no (M3) |
| 17 | Ghost sector numeral | centre-right, `--ink-ghost` | 96 px type | no |
| 18 | Swipe handle + label `2021 ⇄ 2026` | vertical, at `--split` | 24 × 64 | no |

**Reserved space:** the bottom-right 300 × 40 px is *ours* (coordinate readout). MapLibre's attribution and navigation control must be disabled or relocated (`attributionControl: {compact: true}` moved to bottom-left above the legend; `navigationControl: false` — the zoom stack replaces it). Attribution text is still legally required: render it as a 10 px `--ink-3` line inside the legend panel footer.

### SLOT-20…26 · dossier — 380 × main

Top to bottom, fixed order, per `ui-context.md` §4. Controls:

| Slot | Control | Position | Size | Variant | Shortcut |
|---|---|---|---|---|---|
| 20 | Target id + copy button | header left / header right | auto / 28 × 28 | `icon-ghost` | `C` |
| 20 | `VERIFIED` chip | header, under id | auto × 20 | `chip-state` (K7) | — |
| 21 | Tabs `EVIDENCE` `ANALYSIS` `TRACE` `SUPPRESSED` | header bottom, gap 0, equal 4-up | 92 × 32 | `tab` | `1`–`4` (in dossier) |
| 22 | `BEFORE ⇄ AFTER` toggle | measured block, right | 84 × 28 | `chip-toggle` | `B` |
| 23 | Triptych thumbs | body, 3-up, gap `--s-2` | 108 × 108 | `thumb` (K6) | `←/→` |
| 24 | Confidence iris + 5 component rows | body | 348 × auto | gauge | — |
| 25 | **`CONFIRM`** | footer, rightmost | 108 × 36 | **`primary`** | `⏎` |
| 25 | `REJECT` | footer, left of primary, gap `--s-3` | 92 × 36 | `danger-outline` | `⌫` |
| 25 | `EXPORT` | footer, far left | 92 × 36 | `secondary` | `E` |
| 26 | Trace rows + `COPY TRACE_ID` | body bottom | 348 × 28 | `icon-ghost` | — |

**The one-primary rule across slots:** when the dossier footer is visible, `CONFIRM` is the viewport's primary and SLOT-02.7 `DETECT CHANGES` **downgrades to `secondary`**. This is not optional; two signal filled bars on screen is the single most common cause of "this looks amateur". Implement as: `<ConsoleShell>` provides `primaryOwner` context; `DETECT` reads it.

Below 1280 px the dossier collapses to a 48 px rail (SLOT-20 shows only the vertical title); the footer actions move into a bottom action bar docked above SLOT-30, same order, `--h-ctl-lg`.

### SLOT-30 · timeline strip — 72 px

| # | Control | Position | Size |
|---|---|---|---|
| 30.1 | `PLAY` (animate A→B) | left, pad `--s-3` | 36 × 36 |
| 30.2 | Date axis + scene dots | centre, flex | full × 40 |
| 30.3 | Year labels | under axis | 10 px mono |
| 30.4 | Onset-interval band | on axis | signal-wash |
| 30.5 | `RANGE ▾` (1y / 3y / 5y / all) | right, pad `--s-3` | 84 × 28 |

### SLOT-40 · status line — 24 px

`job state` (left, pad 16) · `last action + relative time` (centre-left) · `trace_id` (right, monospace, click-to-copy, `--z-base`). No buttons — the copy affordance is the whole row's right 160 px.

---

## 5. Control maps — other app screens (L5)

Slots do not change between screens; content within them does (`ui-context.md` §4).

### UPLOAD (`G U`)
- SLOT-02 becomes: `SOURCE ▾` (FILE / GEOTIFF / URL-disabled-offline) · `SENSOR ▾` · `RESOLUTION` readout · **`ANALYSE` primary, far right**.
- SLOT-10 becomes the dropzone: dashed `--line-strong` frame, centred aperture icon, `DROP A GeoTIFF OR PNG · ≤ 40 MB`, and one `BROWSE FILES` secondary button — **centred is allowed here because the stage is empty**. Drag-over: frame → signal, wash `--signal-wash` at 6%, single scan sweep (M2), not a spinner.
- SLOT-20 becomes `UPLOAD MANIFEST`: filename, size, CRS, resolution m/px, bands, checksum, and the **Resolution Gate verdict** chip.
- SLOT-30 becomes the job progress bar with honest stage labels (`READING`, `GATE`, `TILES`, `MODEL`, `VERIFY`) — never a fake percentage.

### REVIEW (`G R`)
- SLOT-10 keeps the map; SLOT-20 becomes the **queue**: `SORT ▾` (confidence / area / date) + `FILTER ▾` chips at the top of the body, rows below, footer = `CONFIRM` primary / `REJECT` danger / `SKIP` ghost, plus `12 of 34 reviewed` progress at footer-left.
- Row controls: index (mono), type (cond), area (tabular, right), confidence (right), state chip. Hover behaviour M6.
- Keyboard is the primary interface here: `J/K` move, `⏎` confirm, `⌫` reject, `Space` peek. Show this in the footer as `--t-tag` hints.

### ASK (`G Q`)
- SLOT-02 becomes the **question bar**: full-width input (flex) + `ASK` primary right + `EXAMPLES ▾` ghost left of it. Enter submits; `⇧⏎` newline is not applicable (single line).
- SLOT-20 becomes the **answer panel**: answer text, `MEASURED / INFERRED / UNVERIFIED` chip, the number-verifier rows, `SOURCES` list, `COPY`, `EXPORT REPORT` (footer, secondary), `TRACE` tab.
- SLOT-30 becomes **question history** (last 8, click to restore) — dots are replaced by truncated monospace rows.

### SEARCH (`G F`)
- SLOT-02 becomes: full-width query input + `AOI ▾` + `DATE RANGE` + `SENSOR ▾` + **`SEARCH` primary right**.
- SLOT-20 becomes ranked results with score bars; SLOT-10 shows the selected result; SLOT-30 shows the retrieval's date spread.

### REPORT / EXPORT
- A modal (`--z-modal`), 720 × auto, max-height 80 vh: header `EXPORT REPORT`, body = format radios (`JSON` `PDF` `CSV`) + contents checkboxes + provenance preview, footer = `CANCEL` ghost left / **`EXPORT` primary right**. Never a separate route (it loses map context).

---

## 6. Responsive collapse (L6)

| Viewport | Change |
|---|---|
| ≥ 1440 | Everything as specified. Dossier 380 px |
| 1280–1439 | Dossier 340 px; `stat:passes` hidden (moves to legend) |
| 1024–1279 | Dossier → 48 px rail; year chips → `YEARS ▾`; SLOT-01 stats hidden |
| < 1024 | **Not a supported console target.** Show the `SMALL-SCREEN` notice: one centred panel, `THE CONSOLE NEEDS ≥ 1024 px · OPEN THE LANDING PAGE` + `GO TO OVERVIEW` link. Do not attempt a mobile console |

Nothing in SLOT-00/01/02/40 ever changes height. The map well absorbs all size change.

---

## 7. Placement anti-patterns — symptom → fix (L7)

| Symptom in the current build | Fix, with the rule that mandates it |
|---|---|
| Buttons floating directly over satellite imagery | §4 SLOT-10 — overlays only, ≤ 220 px, at the four insets, `--z-map-overlay` |
| Two signal primary buttons visible at once | §4 one-primary rule + `primaryOwner` context |
| Panel buttons move when content grows | §3 reflow ban — sticky footer, fixed header |
| Numbers jitter as values change | §3 tabular numerals + fixed column widths |
| Icon-only buttons with no label in panels | §3 icon-only permitted in 4 named places only |
| Zoom control duplicated (MapLibre default + ours) | §4 SLOT-12 — `navigationControl: false` |
| Attribution colliding with the coordinate readout | §4 reserved bottom-right 300 × 40 |
| Tooltips opening off-screen at the left rail | §4 SLOT-05 — tooltips right only |
| Controls centred inside dense panels | §3 no centred text outside hero/empty states |
| Random 13 px / 7 px gaps | §1 tokens; lint bans arbitrary values |
| `z-index: 999` | §2 ladder; lint bans numeric z-index |
| Modal opened from a modal | §5 — export is a modal from a screen, never from a modal |

---

## 8. Implementation rules (L8)

1. `frontend/src/components/layout/Slot.tsx` — a single component that renders a named slot: `<Slot id="SLOT-02" h={44}>`. It owns padding, `--z-sticky`, and the border. Passing an unknown `id` throws in dev. **No hand-rolled layout divs for slots.**
2. `frontend/src/lib/slots.ts` — the registry: every slot id, its dimensions, its permitted children (component names), and its collapse behaviour. §4/§5 of this file is generated into it; if they disagree, this file wins and the doc gets corrected.
3. `frontend/src/lib/shortcuts.ts` — one map of every shortcut in §4/§5. Registered once at the shell. Conflicts throw in dev.
4. Lint (eslint `no-restricted-syntax` + a custom rule): ban `z-[`, `zIndex:`, and any Tailwind arbitrary value in `components/`; ban hex literals (already in `ui-context.md` §11).
5. `primaryOwner` is React context provided by `ConsoleShell`; `Button variant="primary"` asserts it is the owner in dev and downgrades itself with a `console.warn` otherwise.
6. Screenshots at 1920 × 1080, 1440 × 900, 1280 × 800 into `docs/screenshots/console-{w}.png` the day each screen is rebuilt (`ui-context.md` §11.5).

---

## 9. Acceptance criteria (L9)

- [ ] Every control in §4/§5 exists at its stated slot, position, size and variant; nothing unlisted is rendered
- [ ] Exactly one `primary` per viewport, enforced by `primaryOwner` (test: render console with dossier open, assert 1)
- [ ] No `z-index` or spacing literal outside the §1/§2 tokens (lint passes)
- [ ] Panel footers do not move when body content changes height (visual test at 3 content lengths)
- [ ] All numeric columns right-aligned and tabular; no reflow when a value changes from 9 to 10 characters
- [ ] Overlays never exceed 220 px per edge and never overlap, except the sanctioned lock-tag/reticle case
- [ ] MapLibre attribution visible and compact; default navigation control disabled
- [ ] All §4 shortcuts work and conflict-check passes in dev
- [ ] 1024/1280/1440/1920 captures committed; < 1024 shows the notice, not a broken console
- [ ] `Slot.tsx` rejects an unregistered slot id in dev
