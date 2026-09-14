# PRD 9 — UI Context and Design System (v2 · INTELLIGENCE CONSOLE)

> **Audience:** Claude Code, frontend developers, anyone writing user-facing copy.
> **Status:** Authoritative. **Supersedes v1 (the light "paper instrument" theme) in full**, by user directive. Do not implement from memory of v1.
> **Visual source of truth:** [`../brand/ui-prototype-intel.html`](../brand/ui-prototype-intel.html) — a working, self-contained prototype of this system including every map hover animation. Open it in a browser; match it.
> **Depends on:** `project-overview.md`, `feature-specs.md`, `data-contracts.md`

---

## 0. Status and the reversal, stated plainly

v1 specified a light, warm-paper interface and argued against dark. **The user has reversed that.** The target is now a **raw intelligence-agency / mission-control console**: near-black field, amber dossier accents, condensed and monospace type, skewed panel bars, huge ghost sector numerals, dot grids, scanlines, and aggressive hover lock-on behaviour over the map — in the visual family of the reference frames (spy-thriller title-sequence UIs and ISRO/NASA-style control rooms).

This file is rewritten accordingly. Everything in v1 that was *not* about colour/light is **carried forward unchanged**, because it protects the project's credibility rather than its mood:

- the `MEASURED` / `INFERRED` / `UNVERIFIED` provenance encodings (now restyled for dark, §2.4)
- "colour is never the only signal" and the greyscale test (§8)
- tabular numerals everywhere (§3)
- the verbatim copy strings in `feature-specs.md` (§10)
- offline constraints: self-hosted fonts, inline SVG icons, bundled basemap (§11)
- the five-state component rule `loading | empty | error | capability_notice | ok` (§5)

**One caution, once, then we build.** The reference frames are *cinema*: they sacrifice legibility for mood (tiny type, 4° panel skews, 6%-opacity labels). A judge must read your suppression counts at arm's length on a washed-out projector. So: take the reference's *vocabulary* — amber dossier bars, dot grids, ghost numerals, lock-on brackets, monospace tags — but keep type sizes, contrast and alignment at instrument grade. **Mission-control, not movie-villain.** Where the two conflict, legibility wins, and the prototype shows where that line sits.

---

## 1. Design thesis

> ### The screen is a console. Every element has a fixed, named slot. Nothing floats, nothing wanders, and nothing moves unless the operator moves first.

Three ideas govern everything:

1. **Fixed slots.** An intelligence console is trusted because the operator's hand knows where everything is before the eyes look. §4 assigns every element a permanent slot ID (`SLOT-…`). A component never appears in a different slot on a different screen.
2. **Amber is the operator's attention.** One accent family (amber/gold) marks anything the system wants the eye on: the live reticle, a locked-on target, an active tab, a measured figure. Everything else is grey-on-black. If two amber things compete in one viewport, one of them is wrong.
3. **The imagery is the only photograph.** Satellite imagery is the sole continuous-tone, full-colour region on screen. All chrome is flat, dark, and graphic. This is what makes the map read as *evidence* and the chrome read as *instrument*.

---

## 2. Colour

### 2.1 Base — near-black, slightly cool, never pure black

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0B0D10` | App field |
| `--bg-grid` | `rgba(240,180,95,0.055)` | Dot-grid + sector lines over `--bg` |
| `--panel` | `#121519` | Panels, dossier, rails |
| `--panel-2` | `#171B21` | Raised insets, tabs, wells |
| `--panel-3` | `#1E242B` | Hover wells, selected rows |
| `--well` | `#0E1114` | Map viewport well (imagery sits here) |
| `--line` | `#262C34` | 1 px borders, dividers |
| `--line-strong` | `#39424D` | Inputs, panel frames, table rules |

Pure `#000` is banned: it crushes the dot grid and makes imagery look pasted-on.

### 2.2 Ink

| Token | Hex | Use | Contrast on `--bg` |
|---|---|---|---|
| `--ink` | `#EDEAE3` | Headings, measured figures, primary text | 15.6:1 (AAA) |
| `--ink-2` | `#A6ADB5` | Body, secondary labels | 8.0:1 (AAA) |
| `--ink-3` | `#6B7480` | Tertiary, placeholders, axis labels | 4.1:1 (AA large / non-text) |
| `--ink-ghost` | `rgba(237,234,227,0.06)` | Ghost sector numerals only | — |

`--ink-3` never carries a number or body copy.

### 2.3 Accent — amber dossier family

| Token | Hex | Use |
|---|---|---|
| `--amber` | `#F0B45F` | Primary accent: reticle, lock-on brackets, active tab, measured figures, dossier bars |
| `--amber-hot` | `#F5C15C` | Hover/active on amber elements; sweep highlights |
| `--amber-deep` | `#8A4B12` | Filled amber bars' text-adjacent shade; disabled amber |
| `--amber-wash` | `rgba(240,180,95,0.12)` | Selected-row wash, tag backgrounds |
| `--teal` | `#35B8C0` | Orbital/satellite metadata, LIVE indicator, "clear pass" dots |
| `--teal-wash` | `rgba(53,184,192,0.12)` | Teal metadata wash |

Amber = *the operator's attention and the ground truth*. Teal = *the satellite / live data path*. Keep them semantically separate, as in v1.

### 2.4 Semantic states — the trust encodings, restyled for dark

Border style remains the mandatory secondary encoding. Colour alone is never the signal.

| State | Fill | Border | Text | Glyph |
|---|---|---|---|---|
| `MEASURED` | `rgba(47,191,113,0.12)` | `#2FBF71` solid 1.5 px | `#5AD79A` | filled dot |
| `INFERRED` | `rgba(240,180,95,0.10)` | `#F0B45F` **dashed** 1.5 px | `#F0B45F` | hollow dot |
| `UNVERIFIED` | transparent | `#6B7480` **dashed** 1.5 px | `#A6ADB5` | hollow dot + `?` |
| `CONFIRMED` | `rgba(47,191,113,0.12)` | `#2FBF71` solid | `#5AD79A` | check |
| `REJECTED` | `rgba(229,72,77,0.12)` | `#E5484D` solid | `#F2767B` | cross |
| `SUPPRESSED` | `rgba(107,116,128,0.10)` | `#6B7480` **dotted** 1.5 px | `#A6ADB5` | struck dot |

Status: success `#2FBF71`, warning `#F0B45F`, danger `#E5484D`, info `#35B8C0`, neutral `#6B7480`.

### 2.5 Data palettes (unchanged semantics, retuned for dark)

Land cover, object class and change-type colour maps stay in `frontend/src/lib/palette.ts`, keyed by the `data-contracts.md` enums, but use the **dark-retuned** values below so they survive on a near-black map. Track 3 boxes remain **dashed**, Tracks 1/2 **solid**, and the legend still states it in words.

| Class | Hex | | Class | Hex |
|---|---|---|---|---|
| `water` | `#4FA3E0` | | `construction` | `#F0B45F` |
| `vegetation` | `#4FB37A` | | `clearance` | `#D9A441` |
| `crop` | `#A8C256` | | `vegetation_gain` | `#4FB37A` |
| `built` | `#E08A5A` | | `water_gain` | `#4FA3E0` |
| `bare` | `#C9A227` | | `water_loss` | `#7FA8C4` |
| `snow` | `#B9C6D2` | | `demolition` | `#8A93A0` |
| `unclassified` | `#6B7480` | | `road` / `other` | `#A6ADB5` |

Object classes: `building #E08A5A`, `building_cluster #F0B45F`, `vehicle #9B7BE0`, `aircraft #5A9BE0`, `ship #4FA3E0`, `ship_large #2E7BB5`, `storage_tank #D9A441`, `swimming_pool #4FD0E0`, `tower #B07BE0`, `container #E07B5A`, `road #A6ADB5`.

Polygon rendering over imagery: stroke at 100% 1.5 px + a 1 px **black inner halo** (on dark UI the halo is dark, not white) so edges stay legible over bright sand and dark water alike. Fill 30%.

---

## 3. Typography

Offline constraint unchanged: **self-host or system stack; no CDN fonts.**

```css
--font-cond: "Bahnschrift", "DIN Alternate", "Franklin Gothic Medium",
             "Arial Narrow", "Inter", sans-serif;      /* display + big numerals */
--font-mono: ui-monospace, "JetBrains Mono", "SFMono-Regular", Menlo,
             Consolas, "Liberation Mono", monospace;   /* dossier tags, IDs, coords */
--font-ui:   "Inter", ui-sans-serif, system-ui, "Segoe UI", Roboto,
             "Noto Sans", "Noto Sans Devanagari", sans-serif;  /* body */
```

`Noto Sans Devanagari` stays in the stack so **चक्षु** renders; verify on the demo machine.

| Token | Size / LH | Family | Weight / case | Use |
|---|---|---|---|---|
| `--t-ghost` | 96 / 1 | cond | 700 | Ghost sector numerals, `--ink-ghost` |
| `--t-display` | 26 / 32 | cond | 700, +0.06em | Screen titles |
| `--t-h1` | 18 / 24 | cond | 700, +0.08em, UPPER | Panel titles, dossier headers |
| `--t-h2` | 15 / 20 | cond | 700, +0.06em, UPPER | Section headings |
| `--t-tag` | 10 / 14 | mono | 600, +0.14em, UPPER | Dossier tags, slot labels, chips |
| `--t-mono` | 12 / 17 | mono | 400 | IDs, checksums, coords, SQL, JSON |
| `--t-body` | 13.5 / 20 | ui | 400 | Body, sentence case |
| `--t-body-strong` | 13.5 / 20 | ui | 600 | Emphasised body |
| `--t-figure` | 30 / 34 | cond | 700, tabular | The measured figure (area, count) |

Rules carried from v1: **tabular-nums on every number**; dates as `9 Jun 2024` in prose and ISO in monospace contexts; the measured figure is the most prominent element in any evidence block; **no number ever animates in a loop** — count-up on reveal only (§6 M7).

Uppercase monospace is for *labels and tags*, never for paragraphs. Body copy stays sentence case — a wall of uppercase is unreadable and reads as costume, not console.

---

## 4. Layout — the console grid (every element has a slot)

Fixed viewport grid. No reflow of slots between screens; screens change *content within* slots, not the slots themselves.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ SLOT-00  DATA-STREAM MARQUEE                                    18 px      │
├────────────────────────────────────────────────────────────────────────────┤
│ SLOT-01  COMMAND BAR: lockup · AOI · stat:area · stat:passes … nav · LIVE 56│
├────────────────────────────────────────────────────────────────────────────┤
│ SLOT-02  TEMPORAL BAR: [A date + year chips + DETECT + SWAP + presets]     │
│                              [B date + year chips]              44 px      │
├────┬───────────────────────────────────────────────────┬───────────────────┤
│SLOT│ SLOT-10 MAP STAGE (the well)                      │ SLOT-20 DOSSIER   │
│-05 │   overlays:                                       │  20 header+VERIFIED│
│rail│   -11 sector tag (TL)   -12 zoom/coord (TR)       │  21 tabs           │
│56px│   -13 legend (BL)       -14 coord readout (BR)    │  22 measured block │
│    │   -15 reticle (cursor)  -16 lock-on tag (target)  │  23 triptych       │
│    │   -17 ghost numeral     -18 swipe handle          │  24 confidence     │
│    ├───────────────────────────────────────────────────┤  25 actions        │
│    │ SLOT-30 TIMELINE STRIP (dots, play, years)  72 px │  26 trace/suppr    │
├────┴───────────────────────────────────────────────────┴───────────────────┤
│ SLOT-40  STATUS LINE: job state · last action · trace_id        24 px      │
└────────────────────────────────────────────────────────────────────────────┘
```

| Slot | Width / height | Contents (permanent) |
|---|---|---|
| `SLOT-00` | full × 18 | Slow marquee: `THEIA DATA STREAM: DRONE // TPOD:02 // AI:ENHANCED · RECON//02 :: //GMT · …` Pauses on hover. |
| `SLOT-01` | full × 56 | Iris lockup + `चक्षु (Chakshu)` + `MOD · ISRO` tag; AOI selector; measured-area stat; clear-pass stat; nav tabs (MAP / REVIEW / UPLOAD / ASK); `LIVE API` indicator with pulsing teal dot. |
| `SLOT-02` | full × 44 | Date-A group, year chips, `DETECT CHANGES` (amber filled, skewed bar), `SWAP`, presets; Date-B group, year chips. |
| `SLOT-05` | 56 × main | Vertical icon rail: MAP, SEARCH, UPLOAD, REVIEW, AUDIT. Active = amber left bar + amber-wash. |
| `SLOT-10` | flex | The imagery well. Cool-neutral `--well`, 1 px `--line-strong` frame, corner ticks. |
| `SLOT-11..18` | overlays | Fixed corners as diagrammed. Never overlap each other; each is ≤ 220 px wide. |
| `SLOT-20..26` | 380 × main | The dossier, top to bottom in this exact order. Collapses to 48 px rail below 1280 px viewport. |
| `SLOT-30` | stage × 72 | Timeline: continuous date axis, usable dots teal-filled, unusable hollow red with reason on hover, compared dates ringed amber, onset interval as amber-wash band, PLAY. |
| `SLOT-40` | full × 24 | Job state, last action, current `trace_id` (monospace, copyable). |

**Rule:** a new UI element must be assigned a slot in this table (edit this file) before it is built. Unslotted elements do not ship. This is what "a particular place for every element" means operationally.

---

## 5. Components (restyled)

- **Dossier bars.** Section headers sit on a skewed amber bar: `transform: skewX(-10deg)`, fill `--amber`, text `--amber-deep` at `--t-tag`, with a 6 px un-skewed square "tab" at the left edge (as in the reference frames). Body content below is *not* skewed.
- **Panels.** `--panel` fill, 1 px `--line` border, 4 px radius (consoles are crisp, not rounded), plus **corner ticks**: 8 px amber L-marks at top-left and bottom-right via pseudo-elements.
- **Chips / tags.** `--t-tag` monospace uppercase, 1 px border in the semantic colour, 2 px radius, 4 px × 8 px padding.
- **Buttons.** Primary = amber filled bar, skewX(-10deg), text `--amber-deep` 700; hover = `--amber-hot` + a 120 ms diagonal sweep highlight. Secondary = transparent, 1 px `--line-strong`, `--ink-2`; hover = border `--amber`, text `--amber`. Destructive = red outline. All ≥ 36 px tall. Focus ring 2 px `--amber`, offset 2.
- **Evidence triptych.** Three 1:1 wells labelled `BEFORE / MASK / AFTER` in `--t-tag`; 1 px `--line-strong` frames; the active one gets an amber frame + corner ticks; captions in `--t-mono` with scene ID, sensor, cloud %.
- **Confidence.** The five-arc iris gauge from v1 survives, restyled: arcs in amber ramp (`--amber-deep → --amber`), pupil shows overall in `--t-tag`; uncalibrated renders at 40% opacity with a dotted outer ring and `UNCALIBRATED` tag. Beside it, the five components as monospace rows with values.
- **Review queue rows.** Monospace index, condensed target type, tabular area, right-aligned confidence; hover = row shifts 2 px right + left amber bar grows 0→3 px (120 ms); selected = `--amber-wash` + amber bar.
- **Empty / loading / error / capability_notice.** Same five-state rule as v1. Empty = the out-of-focus iris in `--line-strong` at 40% with the honest message; loading = skeleton wells in `--panel-2` plus a single scan sweep (not a spinner); error = red frame + code in monospace + copyable `trace_id`; capability notice = amber-wash panel with the aperture icon and the **verbatim** `feature-specs.md` copy, never red.

---

## 6. Map hover and animation specification  ← the priority ask

All map interactions live in `frontend/src/lib/map-fx.ts` as one module. Coordinates are cursor→geo via the AOI bbox. Every effect below is implemented in the prototype; match timings exactly.

**M1 — Cursor reticle + live coordinate readout.**
A full-stage crosshair (1 px `--amber` at 22% opacity, one horizontal + one vertical line through the cursor) plus a 28 px iris reticle ring (2 px `--amber`, four 6 px gap notches) that follows the cursor with a 60 ms lerp lag. `SLOT-14` readout updates `LAT: 28.1395° N / LON: 77.7612° E` in `--t-mono` at pointer-move (throttled to rAF). On pointer-leave the reticle and crosshair fade over 140 ms. *This is the "the eye is looking" behaviour; it must feel attached, never floaty — cap the lag.*

**M2 — Scan sweep on stage enter.**
On pointer-enter, a 2 px `--amber` horizontal line with a 24 px gradient trail sweeps top→bottom once over 900 ms (`linear`), and the dot grid brightens under the cursor via a 240 px radial mask that tracks the pointer. No repeat while the pointer stays inside.

**M3 — Target lock-on (polygon hover).** *The signature interaction.*
On hovering a change polygon: (a) stroke goes `--amber-hot` 2 px, fill 30%→45%; (b) four L-shaped corner brackets animate from 12 px outside the bbox to the bbox corners over 160 ms, staggered 30 ms, `cubic-bezier(0.22,1,0.36,1)`, in `--amber`; (c) a dossier tag panel (`SLOT-16`) slides in 8 px from the bbox top-left over 140 ms, skewed −2°, amber left bar, containing: `TARGET: CONSTRUCTION // ID c67d562`, the measured area with a **400 ms count-up** (`--t-figure`), `MEASURED — UTM 43N` chip, confidence %, and onset date; (d) a 1 px leader line from the bracket to the tag. On leave: brackets retract and tag slides out over 120 ms. Hovering the *tag* keeps the lock (no flicker at the boundary).

**M4 — Sector grid hover.**
The stage carries a faint sector grid (8 × 5). The hovered cell's dots brighten to `--amber` 18% and `SLOT-11` shows `SEC 04·B` in `--t-tag`. Cells are computed from cursor position; no DOM per cell (canvas or CSS background-position).

**M5 — Timeline dot hover.**
Dot scales 8→12 px over 100 ms; tooltip (monospace) shows `09 JUN 2024 · 2.5% CLOUD` or, for unusable dots, the reason (`MONSOON · CLOUD 78%`). Compared dates keep their amber ring.

**M6 — Panel and row hover.**
Dossier rows and queue rows: 2 px right shift + left amber bar 0→3 px over 120 ms. Tabs: amber underline grows from centre over 140 ms. Buttons: diagonal sweep highlight 120 ms (§5).

**M7 — Number tickers.**
Any measured figure counts up over 400 ms (`ease-out`) on first reveal and on value change. **Never loops, never on inferred values** (inferred values appear instantly with their `INFERRED` chip — animating a guess would dress it as a measurement).

**M8 — Live indicators.**
`LIVE API` dot pulses opacity 1→0.35 over 2 s infinite. `SLOT-00` marquee translates over 60 s linear infinite, `animation-play-state: paused` on hover.

**M9 — Ambient scanline.**
A 1 px `rgba(240,180,95,0.05)` line traverses the viewport vertically every 8 s. Subtle enough to be felt, not seen.

**M10 — Screen/panel entry.**
On screen change: dossier slides in 12 px from right over 220 ms; stage fades 140 ms; ghost numeral scales 0.96→1 over 300 ms. Stagger dossier sections 30 ms.

**Reduced motion:** `prefers-reduced-motion` disables M2, M8, M9, M10 and the M1 lag (snap), and makes M7 instant. M3 brackets appear without animation. The console remains fully usable.

---

## 7. Motion tokens

| Token | Value | Use |
|---|---|---|
| `--m-instant` | 80 ms ease-out | hover tints, focus |
| `--m-fast` | 120–160 ms `cubic-bezier(0.22,1,0.36,1)` | brackets, rows, tags, sweeps |
| `--m-base` | 220 ms same | panel/screen entry |
| `--m-scan` | 900 ms linear | M2 sweep |
| `--m-ambient` | 2 s / 8 s / 60 s | M8 / M9 / marquee |
| `--m-tick` | 400 ms ease-out | M7 count-up |

Nothing bounces, overshoots or elasticises. A console is damped.

---

## 8. Accessibility on dark

All v1 rules hold, retuned: AA minimum / AAA body (table in §2.2 satisfies it); colour never sole signal (border styles + glyphs, §2.4); **greyscale test** — screenshot the map in greyscale and confirm every land-cover class and every state chip remains distinguishable; full keyboard operability with `j/k/c/r/e` in the review queue and a visible 2 px amber focus ring everywhere; touch targets ≥ 40 px; no information conveyed by hover alone (every hover tooltip's content also exists in the dossier); `prefers-reduced-motion` honoured (§6).

Dark-specific: keep large-area fills ≥ `#0B0D10` (no pure black) to avoid halation; never place `--ink-3` text on `--panel-3`; amber-on-black passes AAA but **amber as a large fill needs `--amber-deep` text**, not black-on-amber at small sizes.

---

## 9. Imagery and basemap on dark

Satellite true-colour is vivid and reads *better* on near-black than on paper — this is the one place the reversal is a pure win. Rules: imagery sits in `--well` with a 1 px `--line-strong` frame and a 24 px inner vignette (`radial-gradient` to transparent) so edges don't vibrate against the field; per-scene 2–98% percentile stretch, parameters stored and shown; basemap = reduced CARTO dark-matter style or local PMTiles dark style — **no POI icons, no landuse colour, labels at `--ink-3` 70%**; and the app must remain fully usable with **no basemap at all** (`OFFLINE=1` test).

---

## 10. Copy voice

Unchanged from v1 (plain, second person, no apology, no "AI-powered/seamless/intelligent", never hedge a measured number, do hedge inferred ones, "I don't know" where true). Dossier *tags* may use the console shorthand (`TARGET: CONSTRUCTION // ID …`, `SEC 04·B`, `SATNAV//03`) because that is labelling, not prose. **Body sentences and every refusal message stay in the verbatim `feature-specs.md` strings, sentence case.** All copy lives in `lib/copy.ts`; nothing hardcoded in JSX.

---

## 11. Implementation rules

1. Every colour, radius, shadow, duration and font size is a CSS custom property in `app/globals.css`; Tailwind maps to tokens. **No hex literals, no arbitrary values in components.** Lint enforces.
2. `lib/palette.ts` (class maps, §2.5), `lib/copy.ts` (all strings), `lib/map-fx.ts` (all of §6), `components/icons.tsx` (inline SVG only). The iris lockup and reticle are React components, not images — external assets do not load at `OFFLINE=1`.
3. Keyframes are declared once in `globals.css` with the §6 names: `scan-sweep`, `bracket-lock`, `tag-in`, `dot-pulse`, `marquee`, `ambient-scan`, `reticle-fade`.
4. The prototype `brand/ui-prototype-intel.html` is the **visual source of truth**. When this file and the prototype disagree on a timing or a colour, the prototype wins and this file gets corrected.
5. Screenshot every screen at 1280×800 and 1920×1080 into `docs/screenshots/` the day it is built; also greyscale and reduced-motion captures.

---

## 12. Acceptance criteria

- [ ] Every element occupies its §4 slot; no unslotted component ships
- [ ] One amber focal point per viewport; two competing ambers is a bug
- [ ] Imagery is the only continuous-tone colour region
- [ ] M1–M10 implemented in `map-fx.ts` with the exact timings; reticle lag capped and attached
- [ ] Lock-on tag shows a count-up only for `MEASURED` values
- [ ] `MEASURED`/`INFERRED`/`UNVERIFIED` distinguishable with colour removed
- [ ] Greyscale map test passes; dark halation avoided (no pure black fills)
- [ ] Tabular numerals everywhere; no looping number animation
- [ ] Full keyboard operability + visible amber focus ring; five-state components everywhere
- [ ] Verbatim refusal/capability copy from `feature-specs.md`, in amber-wash not red
- [ ] Usable with no basemap; all icons/fonts inline or self-hosted
- [ ] `prefers-reduced-motion` disables M2/M8/M9/M10, snaps M1, instant M7
- [ ] चक्षु renders on the demo machine