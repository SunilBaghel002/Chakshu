# PRD 9 — UI Context and Design System (v3 · SOVEREIGN CONSOLE)

> **Audience:** Claude Code, frontend developers, anyone writing user-facing copy.
> **Status:** Authoritative. **Supersedes v2 (the amber-on-black "intelligence console") in full**, by user directive, 20 Sep 2026. Do not implement from memory of v2.
> **Visual source of truth:** `../brand/ui-prototype-intel.html` — **still not in the repo; do not invent it.** Until it is supplied or §11.4 is amended, this file is the sole authority.
> **Depends on:** `project-overview.md`, `feature-specs.md`, `data-contracts.md`

---

## 0. Status and the two reversals, stated plainly

**v1** specified a light, warm-paper interface. **v2** reversed that to amber-on-black "spy-thriller" intelligence console. **v3 reverses v2's colour, keep v1's and v2's structural gains.**

**Why v2 was wrong.** The user's words: *"dull and worst, and it is not looking like an Indian army software — I am making for Ministry of Defence, so it has to feel just like that, also like ISRO or RAW agency high-tech software."* The critique is correct, and v2 §0 had already half-admitted it: v2 was pitched *"in the visual family of spy-thriller title-sequence UIs"*, and then warned *"mission-control, not movie-villain."* It failed its own warning. Three concrete reasons:

1. **One hue on grey-black is monotone.** `--amber #F0B45F` is a desaturated, low-energy gold — legible but washed out. The entire chrome was one warm hue over a neutral grey-black. No structure, no depth, no hierarchy.
2. **Grey-black is a cinema convention, not an institutional one.** Real defence, space and intelligence software is built on **deep navy** — it reads as sovereign, official and calm rather than theatrical. `#0B0D10` reads as a title card.
3. **It carried no national or institutional signal.** Nothing in v2 said *India*, *Ministry of Defence*, *ISRO*. A judge had to be told. v3 must be recognisable at arm's length.

**What v3 is:** a **sovereign console** — deep navy field, saffron and ISRO-blue accents, a defence classification banner, stencilled institutional typography, regimented grid, and a restrained tricolour rule. It should read as *government instrument* before it reads as *cool*.

**What survives, unchanged, because it protects credibility rather than mood:**

- the `MEASURED` / `INFERRED` / `UNVERIFIED` provenance encodings (§2.4)
- "colour is never the only signal" and the greyscale test (§8)
- tabular numerals everywhere (§3)
- the verbatim copy strings in `feature-specs.md` (§10)
- offline constraints: self-hosted fonts, inline SVG icons, bundled basemap (§11)
- the five-state component rule `loading | empty | error | capability_notice | ok` (§5)
- **§4's slot grid, verbatim.** Positioning was never the problem. Do not move a slot.

**The line we do not cross, said once.** Institutional ≠ gaudy. A tricolour splashed across every panel is costume, and `README.md` warns the *all-seeing eye* framing already risks reading as panopticon. So nationality is expressed with **discipline, not decoration**: one banner, one 3 px rule, two accents doing two jobs. **Sovereignty reads as restraint.** Military software the world over is *more* minimal than consumer software, not less.

---

## 1. Design thesis

> ### The screen is a console. Every element has a fixed, named slot. Nothing floats, nothing wanders, and nothing moves unless the operator moves first.

Four ideas govern everything:

1. **Fixed slots.** An intelligence console is trusted because the operator's hand knows where everything is before the eyes look. §4 assigns every element a permanent slot ID (`SLOT-…`). A component never appears in a different slot on a different screen.
2. **Two accents, two jobs, never mixed.** **Saffron** is the operator's attention — the reticle, a locked-on target, the active tab, the one primary. **ISRO blue** is the data path — satellite metadata, live links, measured figures, retrieval. A thing is one or the other, never both. If two saffron things compete in one viewport, one of them is wrong.
3. **The imagery is the only photograph.** Satellite imagery is the sole continuous-tone, full-colour region on screen. All chrome is flat, navy, and graphic. This is what makes the map read as *evidence* and the chrome read as *instrument*.
4. **Institutional before decorative.** Saffron, white and green are national symbols, not a palette. They appear as a **classification banner** (§5.7) and a **single 3 px rule** (§5.8) — nowhere else. A tricolour used twice reads as officialdom; used everywhere it reads as a flag shop.

---

## 2. Colour

### 2.1 Base — deep navy, institutional, never pure black and never grey-black

The base is **blue-shifted navy**, not neutral grey. This is the single biggest change from v2 and the one that does most of the work: it is what the field of real defence and space software looks like, and it gives the saffron and blue accents something warm-enough and cool-enough to sit on at once.

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#080C16` | App field — deep navy-black |
| `--bg-grid` | `rgba(90,169,255,0.05)` | Dot-grid + sector lines over `--bg` |
| `--panel` | `#0E1626` | Panels, dossier, rails |
| `--panel-2` | `#131D31` | Raised insets, tabs, wells |
| `--panel-3` | `#1A2740` | Hover wells, selected rows |
| `--well` | `#060910` | Map viewport well (imagery sits here) |
| `--line` | `#1E2B44` | 1 px borders, dividers |
| `--line-strong` | `#31435F` | Inputs, panel frames, table rules |
| `--steel` | `#8FA3BC` | Neutral metallic: frame ticks, rules, insignia strokes |

Pure `#000` is banned: it crushes the dot grid, kills the navy register, and makes imagery look pasted-on.

**Depth rule (new in v3):** the navy stack `--bg → --panel → --panel-2 → --panel-3` is a *luminance ladder*. Never place a panel on a panel of the same step; go one step up. v2's flatness came from ignoring this.

### 2.2 Ink — cool sovereign white

| Token | Hex | Use | Contrast on `--bg` |
|---|---|---|---|
| `--ink` | `#E9EFF8` | Headings, measured figures, primary text | 15.4:1 (AAA) |
| `--ink-2` | `#9DAEC6` | Body, secondary labels | 7.9:1 (AAA) |
| `--ink-3` | `#61738C` | Tertiary, placeholders, axis labels | 4.0:1 (AA large / non-text) |
| `--ink-ghost` | `rgba(233,239,248,0.06)` | Ghost sector numerals only | — |

`--ink-3` never carries a number or body copy. Ink is **cool** — slight blue cast. Warm ink on navy fights the saffron accent.

### 2.3 Accents — saffron (attention) and ion-blue (data)

**Token names changed in v3.** `--amber*` → `--signal*`; `--teal*` → `--ion*`. The old names described a colour; these describe a *role*, so the palette can be retuned again without a rename. **Compatibility:** the existing `frontend/src/index.css` still defines `--amber*`/`--teal*`; during the Phase 8 rebuild, `--amber` maps to `--signal` and `--teal` maps to `--ion`, then the old names are deleted (task 8.1).

| Token | Hex | Use |
|---|---|---|
| `--signal` | `#FF9426` | **Saffron.** Operator attention: reticle, lock-on brackets, active tab, the one primary, dossier bars |
| `--signal-hot` | `#FFAA4D` | Hover/active on signal elements; sweep highlights |
| `--signal-deep` | `#8A4208` | Deep shade: disabled signal, gradient floor |
| `--signal-ink` | `#1F1200` | **Text placed *on* a filled `--signal` bar.** 9.1:1 — never use `--signal` or `--ink` for this |
| `--signal-wash` | `rgba(255,148,38,0.13)` | Selected-row wash, tag backgrounds |
| `--ion` | `#3FA9F5` | **ISRO blue.** Satellite/orbital metadata, `LIVE` indicator, clear-pass dots, measured figures, retrieval scores |
| `--ion-hot` | `#6BC2FF` | Hover on ion elements |
| `--ion-wash` | `rgba(63,169,245,0.12)` | Ion metadata wash |

**Saffron = the operator's attention and the ground truth. Ion = the satellite and the live data path.** The split is inherited from v1's amber/teal and is worth keeping: it means a viewer can tell *what the system is looking at* from *what the system is measuring*, by colour alone — and then confirm it by the border style, per §2.4.

**Why these exact values:** `#FF9426` sits between ISRO's orange and India's saffron while staying legible on navy at 7.6:1 (AAA). `#3FA9F5` echoes ISRO's institutional blue at 6.6:1. Both are far more saturated than v2's `#F0B45F`/`#35B8C0` — that saturation gap *is* the "dull" fix.

### 2.4 Semantic states — the trust encodings, restyled for dark

Border style remains the mandatory secondary encoding. Colour alone is never the signal. **These six states are the project's credibility** — they are the one place where colour is dictated by meaning, not by taste. Do not retune them for looks.

| State | Fill | Border | Text | Glyph |
|---|---|---|---|---|
| `MEASURED` | `rgba(47,191,113,0.12)` | `#2FBF71` solid 1.5 px | `#5AD79A` | filled dot |
| `INFERRED` | `rgba(255,148,38,0.10)` | `#FF9426` **dashed** 1.5 px | `#FF9426` | hollow dot |
| `UNVERIFIED` | transparent | `#61738C` **dashed** 1.5 px | `#9DAEC6` | hollow dot + `?` |
| `CONFIRMED` | `rgba(47,191,113,0.12)` | `#2FBF71` solid | `#5AD79A` | check |
| `REJECTED` | `rgba(229,72,77,0.12)` | `#E5484D` solid | `#F2767B` | cross |
| `SUPPRESSED` | `rgba(97,115,140,0.10)` | `#61738C` **dotted** 1.5 px | `#9DAEC6` | struck dot |

Status: success `#2FBF71`, warning `#FF9426`, danger `#E5484D`, info `#3FA9F5`, neutral `#61738C`.

**Note the deliberate collision:** `INFERRED` and `status:warning` both use `--signal`. That is intentional — an inferred value *is* the system's caution made visible. The dashed border is what distinguishes them, which is exactly why the border encoding is mandatory and not decorative.

**Green here is a trust encoding, not a national one.** `MEASURED` green `#2FBF71` is a different hue from the flag's green and serves `project-overview.md` §2 — it means *this number came from geometry*. Never restyle it to match the tricolour.

### 2.5 Data palettes (unchanged semantics, retuned for dark)

Land cover, object class and change-type colour maps stay in `frontend/src/lib/palette.ts`, keyed by the `data-contracts.md` enums, but use the **dark-retuned** values below so they survive on a near-black map. Track 3 boxes remain **dashed**, Tracks 1/2 **solid**, and the legend still states it in words.

| Class | Hex | | Class | Hex |
|---|---|---|---|---|
| `water` | `#4FA3E0` | | `construction` | `#FF9426` |
| `vegetation` | `#4FB37A` | | `clearance` | `#D9A441` |
| `crop` | `#A8C256` | | `vegetation_gain` | `#4FB37A` |
| `built` | `#E08A5A` | | `water_gain` | `#4FA3E0` |
| `bare` | `#C9A227` | | `water_loss` | `#7FA8C4` |
| `snow` | `#B9C6D2` | | `demolition` | `#8A93A0` |
| `unclassified` | `#61738C` | | `road` / `other` | `#9DAEC6` |

Object classes: `building #E08A5A`, `building_cluster #FF9426`, `vehicle #9B7BE0`, `aircraft #5A9BE0`, `ship #4FA3E0`, `ship_large #2E7BB5`, `storage_tank #D9A441`, `swimming_pool #4FD0E0`, `tower #B07BE0`, `container #E07B5A`, `road #9DAEC6`.

Polygon rendering over imagery: stroke at 100% 1.5 px + a 1 px **black inner halo** (on dark UI the halo is dark, not white) so edges stay legible over bright sand and dark water alike. Fill 30%.

**These class colours are chosen for separation on imagery, not for institutional meaning.** `construction` happens to be `--signal`-hued, which is correct — it *is* the change the operator is looking for. But `bare #C9A227` is a class colour and must **not** be recoloured to flag-green just because the tricolour is nearby. Imagery legibility outranks national register.

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
| `SLOT-00A` | full × 28 | **NEW in v3.** Classification banner (`§5.7`): saffron fill, `FOR OFFICIAL USE ONLY · NOT FOR PUBLIC RELEASE`, 3 px tricolour bottom edge. Above SLOT-00, `--z-sticky`. |
| `SLOT-00` | full × 18 | Slow marquee: `THEIA DATA STREAM: DRONE // TPOD:02 // AI:ENHANCED · RECON//02 :: //GMT · …` Pauses on hover. |
| `SLOT-01` | full × 56 | Iris lockup + `चक्षु (Chakshu)` + `MOD · ISRO` tag; AOI selector; measured-area stat; clear-pass stat; nav tabs (MAP / REVIEW / UPLOAD / ASK); `LIVE API` indicator with pulsing **ion** dot. |
| `SLOT-02` | full × 44 | Date-A group, year chips, `DETECT CHANGES` (signal filled, skewed bar), `SWAP`, presets; Date-B group, year chips. |
| `SLOT-05` | 56 × main | Vertical icon rail: MAP, SEARCH, UPLOAD, REVIEW, AUDIT. Active = signal left bar + signal-wash. |
| `SLOT-10` | flex | The imagery well. Cool-neutral `--well`, 1 px `--line-strong` frame, corner ticks. |
| `SLOT-11..18` | overlays | Fixed corners as diagrammed. Never overlap each other; each is ≤ 220 px wide. |
| `SLOT-20..26` | 380 × main | The dossier, top to bottom in this exact order. Collapses to 48 px rail below 1280 px viewport. |
| `SLOT-30` | stage × 72 | Timeline: continuous date axis, usable dots **ion**-filled, unusable hollow red with reason on hover, compared dates ringed **signal**, onset interval as **signal**-wash band, PLAY. |
| `SLOT-40` | full × 24 | Job state, last action, current `trace_id` (monospace, copyable). |

**Rule:** a new UI element must be assigned a slot in this table (edit this file) before it is built. Unslotted elements do not ship. This is what "a particular place for every element" means operationally.

---

## 5. Components (restyled for v3)

- **Dossier bars.** Section headers sit on a skewed signal bar: `transform: skewX(-10deg)`, fill `--signal`, text `--signal-ink` at `--t-tag`, with a 6 px un-skewed square "tab" at the left edge. Body content below is *not* skewed.
- **Panels.** `--panel` fill, 1 px `--line` border, 4 px radius (consoles are crisp, not rounded), plus **corner ticks**: 8 px `--steel` L-marks at top-left and bottom-right via pseudo-elements. **Ticks are `--steel`, not `--signal`** — v3 moves them off the accent so the accent stays rare. Corner ticks are chrome; saffron is attention.
- **Chips / tags.** `--t-tag` monospace uppercase, 1 px border in the semantic colour, 2 px radius, 4 px × 8 px padding.
- **Buttons.** Primary = signal filled bar, skewX(-10deg), text `--signal-ink` 700; hover = `--signal-hot` + a 120 ms diagonal sweep. Secondary = transparent, 1 px `--line-strong`, `--ink-2`; hover = border `--signal`, text `--signal`. Destructive = red outline. All ≥ 36 px tall. Focus ring 2 px `--signal`, offset 2.
- **Evidence triptych.** Three 1:1 wells labelled `BEFORE / MASK / AFTER` in `--t-tag`; 1 px `--line-strong` frames; the active one gets a signal frame + corner ticks; captions in `--t-mono` with scene ID, sensor, cloud %.
- **Confidence.** The five-arc iris gauge survives, restyled: arcs in the **ion** ramp (`--ion` at 40% → `--ion` 100%), pupil shows overall in `--t-tag`; uncalibrated renders at 40% opacity with a dotted outer ring and `UNCALIBRATED` tag. Beside it, the five components as monospace rows with values. **Ion, not signal** — confidence is a measurement, and measurements belong to the data path (§2.3).
- **Review queue rows.** Monospace index, condensed target type, tabular area, right-aligned confidence; hover = row shifts 2 px right + left signal bar grows 0→3 px (120 ms); selected = `--signal-wash` + signal bar.
- **Empty / loading / error / capability_notice.** Empty = the out-of-focus iris in `--line-strong` at 40% with the honest message; loading = skeleton wells in `--panel-2` plus a single scan sweep (not a spinner); error = red frame + code in monospace + copyable `trace_id`; capability notice = `--signal-wash` panel with the aperture icon and the **verbatim** `feature-specs.md` copy, **never red**.

### 5.7 Classification banner — *new in v3, the primary national signal*

A **28 px full-width bar above SLOT-00**, at `--z-sticky`, on every console screen. This is the single strongest institutional cue in the system and it costs one row of pixels.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ▌ चक्षु · CHAKSHU      FOR OFFICIAL USE ONLY · NOT FOR PUBLIC RELEASE   🇮🇳 │
└────────────────────────────────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Height | 28 px, full width, above SLOT-00 |
| Fill | `--signal` at 100% |
| Text | `--signal-ink`, `--t-tag`, 600, `+0.14em`, UPPER |
| Left mark | 4 px `--signal-ink` inset bar at the left edge, full banner height |
| Centred text | `FOR OFFICIAL USE ONLY · NOT FOR PUBLIC RELEASE` |
| Right | The tricolour rule (§5.8), 24 × 3 px, or the Ashoka-chakra glyph if supplied |

**The classification caveat, stated honestly.** *FOR OFFICIAL USE ONLY* is a real Indian Government handling caveat. It is correct and expected for a MoD demonstration — **but it must not imply the software has been accredited.** Add one `--t-mono` line in the footer or `/privacy`: `DEMONSTRATION BUILD · NOT AN ACCREDITED SYSTEM`. An unqualified classification marking on an unaccredited hackathon build is the same category of error as a fabricated benchmark, and a serving officer in the room will notice. See §10.

**If the banner is ever the only tricolour on screen, that is fine.** It is meant to carry the signal alone.

### 5.8 The tricolour rule — *new in v3, the discipline that keeps §5.7 from becoming costume*

A **3 px horizontal rule** in three equal bands: `#FF9426` · `#FFFFFF` · `#138808`.

**Where it may appear — the complete list:**

1. As a 3 px **bottom edge of the §5.7 classification banner**
2. As a 3 px **top edge of the landing page hero** (`landing-page.md` W2.1)
3. As a 3 px **bottom edge of the landing page footer**

**Where it must never appear:** as a panel border, a card accent, a tab underline, a chart series colour, a hover state, a divider between sections, an icon stroke, or anywhere in the console's working area. **Three permitted placements, no more.** If you find yourself adding a fourth, the answer is no.

**On the white band:** `#FFFFFF` at 3 px is permitted because it is a *rule*, not a surface, and contrast rules do not apply. It must never be used as a fill behind text, or as a card/panel background.

### 5.9 Ashoka Chakra — optional, and only if a clean vector exists

The 24-spoke Ashoka Chakra is the **only** non-tricolour national symbol permitted, and only in two places: inside the §5.7 banner at 16 px, and on the landing page hero. It must be an **inline SVG**, hand-drawn as 24 evenly-spaced spokes at `--ion` or `--steel`.

**Do not trace or approximate it.** A malformed chakra is worse than none — it is the same failure as a wrong number. If a correct vector is not available, ship without it; the tricolour rule carries the signal adequately. Do not use an emoji flag or a raster image (external assets fail at `OFFLINE=1`).

### 5.10 Stencil motifs — *use sparingly, or not at all*

Defence software has a register of its own: stencilled serials, hatch-mark panels, `//` separators, bounding-box brackets, unit designators. Borrow the **serials and brackets** (already in `--font-mono` tags and the M3 lock-on). **Do not** add camouflage patterns, drop shadows, gradients, glow, or raster texture. A console is drawn with lines and type, never with texture.

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
`LIVE API` dot pulses opacity 1→0.35 over 2 s infinite, in `--ion`. `SLOT-00` marquee translates over 60 s linear infinite, `animation-play-state: paused` on hover. **The §5.7 classification banner never animates** — a pulsing or sweeping classification marking reads as a warning state and is exactly the "movie-villain" failure v2 made. It is static, always.

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

All earlier rules hold, retuned for navy: AA minimum / AAA body (table in §2.2 satisfies it); colour never sole signal (border styles + glyphs, §2.4); **greyscale test** — screenshot the map in greyscale and confirm every land-cover class and every state chip remains distinguishable; full keyboard operability with `j/k/c/r/e` in the review queue and a visible 2 px signal focus ring everywhere; touch targets ≥ 40 px; no information conveyed by hover alone (every hover tooltip's content also exists in the dossier); `prefers-reduced-motion` honoured (§6).

Dark-specific: keep large-area fills ≥ `#080C16` (no pure black) to avoid halation; never place `--ink-3` text on `--panel-3`; signal-on-navy passes AAA but **signal as a large fill needs `--signal-ink` text**, not `--ink` and not black.

**Navy-specific, new in v3:**

- **The saffron/blue pair must survive greyscale.** `--signal #FF9426` and `--ion #3FA9F5` are close in relative luminance. In greyscale they are distinguishable but not obviously so — which is *precisely why* every use of either is paired with a non-colour signal (a border style, a glyph, a label). Re-run the greyscale test specifically on the §2.4 state chips and on the `LIVE`/`DEGRADED`/`OFFLINE` status dots.
- **Never signal-on-ion or ion-on-signal.** Placing the attention accent on a data-path fill blends the two roles the whole system depends on keeping separate. If they must sit adjacent, use `--line-strong` between them.
- **The tricolour must never carry meaning.** It is register, not information. If a screenshot loses the §5.8 rule entirely, no function is impaired — that is the test that it has not become a semantic channel.

---

## 9. Imagery and basemap on dark

Satellite true-colour is vivid and reads *better* on near-black than on paper — this is the one place the reversal is a pure win. Rules: imagery sits in `--well` with a 1 px `--line-strong` frame and a 24 px inner vignette (`radial-gradient` to transparent) so edges don't vibrate against the field; per-scene 2–98% percentile stretch, parameters stored and shown; basemap = reduced CARTO dark-matter style or local PMTiles dark style — **no POI icons, no landuse colour, labels at `--ink-3` 70%**; and the app must remain fully usable with **no basemap at all** (`OFFLINE=1` test).

---

## 10. Copy voice

Unchanged from v1 (plain, second person, no apology, no "AI-powered/seamless/intelligent", never hedge a measured number, do hedge inferred ones, "I don't know" where true). Dossier *tags* may use the console shorthand (`TARGET: CONSTRUCTION // ID …`, `SEC 04·B`, `SATNAV//03`) because that is labelling, not prose. **Body sentences and every refusal message stay in the verbatim `feature-specs.md` strings, sentence case.** All copy lives in `lib/copy.ts`; nothing hardcoded in JSX.

---

## 11. Implementation rules

1. Every colour, radius, shadow, duration and font size is a CSS custom property in `frontend/src/index.css` (on Vite — not `app/globals.css`, see `code-standards.md` §1.1); Tailwind v4 `@theme` maps to tokens. **No hex literals, no arbitrary values in components.** Lint enforces.
2. `lib/palette.ts` (class maps, §2.5), `lib/copy.ts` (all strings), `lib/map-fx.ts` (all of §6), `components/icons.tsx` (inline SVG only). The iris lockup and reticle are React components, not images — external assets do not load at `OFFLINE=1`.
3. Keyframes are declared once in `index.css` with the §6 names: `scan-sweep`, `bracket-lock`, `tag-in`, `dot-pulse`, `marquee`, `ambient-scan`, `reticle-fade`.
4. **⚠ `brand/ui-prototype-intel.html` does not exist in the repository** (checked 20 Sep 2026). §6 and §11.4 depend on it as the tie-breaker for M1–M10 timings. Until it is supplied, **this file is the sole source of truth for timings**, tasks 8.6/8.7 cannot claim their acceptance criterion, and §11.4's "prototype wins" rule is inoperative. Do not invent a prototype.
5. Screenshot every screen at 1280×800 and 1920×1080 into `docs/screenshots/` the day it is built; also greyscale and reduced-motion captures.

---

## 12. Acceptance criteria

- [ ] Every element occupies its §4 slot; no unslotted component ships
- [ ] One signal focal point per viewport; two competing signals is a bug
- [ ] Imagery is the only continuous-tone colour region
- [ ] M1–M10 implemented in `map-fx.ts` with the exact timings; reticle lag capped and attached
- [ ] Lock-on tag shows a count-up only for `MEASURED` values
- [ ] `MEASURED`/`INFERRED`/`UNVERIFIED` distinguishable with colour removed
- [ ] Greyscale map test passes; dark halation avoided (no pure black fills)
- [ ] Tabular numerals everywhere; no looping number animation
- [ ] Full keyboard operability + visible signal focus ring; five-state components everywhere
- [ ] Verbatim refusal/capability copy from `feature-specs.md`, in signal-wash not red
- [ ] Usable with no basemap; all icons/fonts inline or self-hosted
- [ ] `prefers-reduced-motion` disables M2/M8/M9/M10, snaps M1, instant M7
- [ ] चक्षु renders on the demo machine
- [ ] **§5.7 classification banner present on every console screen, and the `DEMONSTRATION BUILD · NOT AN ACCREDITED SYSTEM` line present in the footer or `/privacy`**
- [ ] **The §5.8 tricolour rule appears in at most the three permitted placements — verified by grep, not by eye**
- [ ] **No tricolour in any panel border, tab underline, chart series, hover state or divider**
- [ ] **`--signal` and `--ion` are never adjacent as fill-on-fill without `--line-strong` between them**
- [ ] **The banner and rule are reproduced in greyscale without loss of any function**