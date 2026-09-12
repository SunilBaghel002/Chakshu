# PRD 9 — UI Context and Design System

> **Audience:** Claude Code, frontend developers, and anyone writing user-facing copy.
> **Status:** Authoritative. **Do not invent colours, spacing, type, or component styling.** Everything is specified here. If something is missing, add it here first, then use it.
> **Depends on:** `project-overview.md`, `feature-specs.md`, `data-contracts.md`

---

## 1. Design thesis

**Chakshu** (चक्षु) means *the eye*. The tagline is *"The eye that never blinks — from orbit to evidence."*

The interface is built on one idea:

> ### The map is the pupil. Everything else is the iris, arranged around it, getting quieter as it goes outward.

Concretely, that means luminance falls off from the centre of the screen. The imagery viewport is the brightest, highest-contrast, most saturated region. The panels around it are progressively calmer. The outer chrome — navigation, headers, status bars — is nearly invisible.

The eye is drawn to the satellite imagery because that is where the evidence is, and nowhere else. **Nothing in the chrome competes with it.** No gradient headers, no colourful nav icons, no decorative panels.

### Light, not dark

This is a **light interface**. Deliberately, and for reasons worth stating because a judge may ask:

1. **Long analytical sessions.** An imagery analyst reviews a queue for hours. A dark UI with bright satellite imagery inside it produces a high-contrast frame around every panel, which causes more eye strain than the reverse, not less.
2. **Printed and projected output.** Reports get printed. Demos get projected onto washed-out conference-room screens. Light survives both; dark dies on a projector.
3. **It reads as a document, not a game.** A light, paper-toned, typographically careful interface signals *official record*. A dark UI with neon accents signals *hacker demo*. For a Ministry of Defence deliverable with an audit trail, the first framing is worth real marks.
4. **It makes the imagery the only colourful thing on screen.** Satellite true-colour is vivid. On a neutral light background it sings. On a dark background it competes with every accent colour you chose.

### A note on the "eye of god" framing

The iris geometry is central to this design and it is genuinely good. But be deliberate about how far to push the *all-seeing eye* idea.

An unblinking omniscient eye watching a population is a surveillance symbol with a long and uncomfortable history — the Eye of Providence, the panopticon, and a great deal of dystopian visual language. For a defence imagery product, leaning hard into that framing risks reading as something the panel would rather not fund.

The Sanskrit itself does not carry that baggage. **चक्षु is simply sight, perception, the faculty of seeing** — it appears throughout Vedic and Upanishadic usage as a neutral word for vision. So: keep the name, keep the iris geometry, keep the luminous clarity. Frame it as **a precise scientific instrument that does not look away**, not as an eye watching people.

Practical translation of that principle:

| ✅ Do | ❌ Don't |
|---|---|
| Iris rings as focus, precision, and aperture | A literal staring eyeball as a mascot or logo |
| Scan pulses radiating outward from a selected area | An eye graphic that tracks the cursor |
| "The eye that never blinks" applied to *coverage* — continuous monitoring that discards nothing silently | The same phrase applied to *watching people* |
| Calm, clinical, instrument-panel luminosity | Ominous dark vignettes, glowing red reticles |

If a design choice makes the product feel like it is watching the user or the population, cut it.

---

## 2. Colour

### 2.1 The base — warm paper, not white

Pure white (`#FFFFFF`) behind hours of analysis is harsh, and it makes satellite imagery look flat by comparison. The base is a warm off-white.

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#FAF8F4` | App background. Warm paper. |
| `--surface` | `#FFFFFF` | Cards, panels, popovers — the raised layer |
| `--surface-sunken` | `#F3F0E9` | Wells, code blocks, insets, table headers |
| `--surface-hover` | `#F6F3ED` | Hover on any interactive row |
| `--surface-active` | `#EFEBE2` | Pressed / selected row |
| `--map-well` | `#EDEFF1` | **The frame around the imagery viewport — see §2.2** |

### 2.2 The map well is cool, the chrome is warm — this is not an accident

Satellite true-colour imagery is a **cool, neutral** image. Put it inside a warm paper UI and it clashes: the surroundings look yellow and the imagery looks blue.

So the imagery viewport sits in a **cool neutral well** (`--map-well`, `#EDEFF1`), and everything else is warm. The two never touch directly — there is always a 1 px border and usually 8–16 px of padding between them.

The effect is that the map looks like a photograph mounted on paper. That is exactly the intended feeling.

### 2.3 Ink

| Token | Hex | Use | Contrast on `--bg` |
|---|---|---|---|
| `--ink` | `#1A1712` | Headings, primary text, numbers | 16.1:1 (AAA) |
| `--ink-2` | `#57503F` | Body text, secondary labels | 8.1:1 (AAA) |
| `--ink-3` | `#8A8272` | Tertiary, placeholders, metadata | 3.6:1 (AA large / non-text only) |
| `--ink-inverse` | `#FAF8F4` | Text on dark fills | — |

`--ink-3` **must never be used for body text or for any number.** Metadata and icons only.

### 2.4 Borders

| Token | Hex | Use |
|---|---|---|
| `--line` | `#E4DFD4` | Default 1 px border, dividers |
| `--line-strong` | `#C9C2B2` | Inputs, tables, anything the user must find |
| `--line-focus` | `#8A4B12` | Focus ring inner edge |

### 2.5 The iris — brand accent

A copper-amber, taken from the human iris. Used sparingly: **focus, active state, and the single primary action on any screen.** If it appears more than twice in a viewport, something is wrong.

| Token | Hex | Use |
|---|---|---|
| `--iris-900` | `#5C3009` | Deepest ring; text on light iris fills |
| `--iris-700` | `#8A4B12` | Primary button, active nav, focus ring |
| `--iris-500` | `#C67C1E` | Secondary ring, hover on primary, progress |
| `--iris-300` | `#F0B45F` | Tertiary ring, chart accent |
| `--iris-50` | `#FDF2DF` | Selected-row wash, badge background |

### 2.6 The orbit — data accent

A deep teal, for anything that refers to the *satellite* rather than the *ground*: scene dots, ingestion status, sensor metadata, orbital paths.

| Token | Hex | Use |
|---|---|---|
| `--orbit-700` | `#0F5F63` | Scene markers, sensor chips |
| `--orbit-500` | `#1B8A8F` | Links, secondary data accents |
| `--orbit-100` | `#D6ECEE` | Wash behind orbital metadata |

**Iris = the ground and the user's attention. Orbit = the satellite and the data provenance.** Keep them semantically separated. Do not use teal for a primary button.

### 2.7 Evidence states — the semantic core

These carry the project's central promise and must never be repurposed.

| State | Fill | Border | Text | Chip style |
|---|---|---|---|---|
| `MEASURED` | `#E6F2EA` | `#1F6B3A` solid 1.5 px | `#1F6B3A` | Solid border, filled dot |
| `INFERRED` | `#FBF0DA` | `#8A5A0B` dashed 1.5 px | `#7A4E08` | Dashed border, hollow dot |
| `UNVERIFIED` (model track) | `#FFFFFF` | `#A8552F` dashed 1.5 px | `#8A4222` | Dashed border, hollow dot, `?` glyph |
| `CONFIRMED` | `#E6F2EA` | `#1F6B3A` solid | `#1F6B3A` | Solid + check glyph |
| `REJECTED` | `#F8E9E7` | `#8C2F27` solid | `#8C2F27` | Solid + cross glyph |
| `SUPPRESSED` | `#EFEEE9` | `#6B655B` dotted 1.5 px | `#57503F` | Dotted border, struck-through dot |

**Border style is a mandatory secondary encoding.** Colour alone is never the signal — see §8. A colourblind user must be able to tell `MEASURED` from `INFERRED` from the border and the dot alone.

### 2.8 Land-cover palette (Tracks 1 and 2)

Fixed, keyed by canonical class. Defined once in `frontend/src/lib/palette.ts`. **Never generated at runtime, never chosen by a model.**

| Class | Hex | Greyscale value | Secondary mark |
|---|---|---|---|
| `water` | `#1B6FA8` | 26% | ── solid |
| `vegetation` | `#2E7D4F` | 33% | ▨ 45° hatch |
| `crop` | `#7A9A2E` | 45% | ▦ grid |
| `built` | `#A8552F` | 30% | ■ solid fill |
| `bare` | `#B08948` | 47% | ▧ reverse hatch |
| `snow` | `#9FB3C0` | 68% | ┄ dotted |
| `unclassified` | `#8A8272` | 40% | ░ stipple |

Fill polygons at **35% opacity** over imagery. Stroke at 100%, 1.5 px.

### 2.9 Object-class palette (Track 3)

| Class | Hex |
|---|---|
| `building` | `#A8552F` |
| `building_cluster` | `#C2703F` |
| `vehicle` | `#6B4E9E` |
| `aircraft` | `#2E6DA4` |
| `ship` | `#1B6FA8` |
| `ship_large` | `#14557F` |
| `storage_tank` | `#8A6D1F` |
| `swimming_pool` | `#3FA9C9` |
| `tower` | `#7A4B8C` |
| `container` | `#B0563A` |
| `road` | `#57503F` |

Track 3 boxes are **always dashed**, Tracks 1 and 2 **always solid** (`feature-specs.md` §B3). The legend states this in words, not just by example:

> *Solid outline — measured directly from the pixels. Dashed outline — identified by a vision model, not verified.*

### 2.10 Change-type palette

| Type | Hex |
|---|---|
| `construction` | `#A8552F` |
| `demolition` | `#6B655B` |
| `clearance` | `#8C6A1F` |
| `vegetation_gain` | `#2E7D4F` |
| `water_gain` | `#1B6FA8` |
| `water_loss` | `#7FA8C4` |
| `road` | `#57503F` |
| `expansion` | `#C2703F` |
| `contraction` | `#8A8272` |
| `other` | `#8A8272` |

### 2.11 Status

| State | Hex |
|---|---|
| success | `#1F6B3A` |
| warning | `#8A5A0B` |
| danger | `#8C2F27` |
| info | `#0F5F63` |
| neutral | `#6B655B` |

**There is no `#FF0000` and no `#00FF00` anywhere in this system.** Saturated primaries look like a debugging overlay, not an instrument.

---

## 3. Typography

### 3.1 Offline constraint — read this first

The finale demo runs with the network disabled. **A Google Fonts `<link>` will fail and fall back unpredictably.** Therefore:

- **Self-host** any webfont, or use the system stack.
- The system stack below is the default and requires nothing. Self-hosting is a P2 enhancement.

```css
--font-ui: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
           "Helvetica Neue", "Noto Sans", "Noto Sans Devanagari", sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
             "Liberation Mono", monospace;
```

`Noto Sans Devanagari` is in the stack because **चक्षु must render correctly.** Verify it on the demo machine — Devanagari shaping is not guaranteed on every Linux install. If it fails, drop the Devanagari lockup on that machine rather than shipping broken glyphs.

### 3.2 Scale

Base 16 px. A 1.2 ratio — tight, because this is a dense instrument panel, not a marketing page.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `--t-display` | 28 / 34 | 600 | Screen titles only |
| `--t-h1` | 22 / 28 | 600 | Panel titles |
| `--t-h2` | 18 / 24 | 600 | Section headings |
| `--t-h3` | 15 / 20 | 600 | Card titles, group labels |
| `--t-body` | 14 / 20 | 400 | Default body |
| `--t-body-strong` | 14 / 20 | 600 | Emphasised body |
| `--t-small` | 12 / 16 | 400 | Metadata, captions, table cells |
| `--t-micro` | 11 / 14 | 500 | Chips, badges, axis labels — **uppercase, +0.04em tracking** |
| `--t-mono` | 13 / 18 | 400 | IDs, checksums, coordinates, SQL, JSON |

### 3.3 Numbers

**Every numeric value uses `font-variant-numeric: tabular-nums`.** Areas, dates, counts, confidence scores, percentages. Non-negotiable — in a review queue of 200 rows, proportional figures make columns unreadable and make change invisible.

Large measurements (`area_label`, `18.43 ha`) use `--t-h2` with `tabular-nums` and `font-weight: 600`. **The number is the most visually prominent thing in an evidence card**, above the title. That ordering is deliberate: this product's value is its measurements.

### 3.4 Dates

Display format: `9 Jun 2024`. Never `06/09/2024` — ambiguous between DD/MM and MM/DD, and the team spans both conventions. ISO `2024-06-09` only in monospace contexts (trace, export, audit).

---

## 4. Spacing, shape, elevation

### 4.1 Spacing — 4 px base

`2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`

Tokens: `--s-1` through `--s-9`. **No arbitrary values.** If you need 13 px, use 12 or 16.

| Pattern | Value |
|---|---|
| Panel padding | 16 |
| Card padding | 12 |
| Gap between cards | 8 |
| Gap between panel sections | 24 |
| Inline icon-to-label gap | 8 |
| Table cell padding | 8 vertical, 12 horizontal |

### 4.2 Radius

| Token | Value | Use |
|---|---|---|
| `--r-sm` | 4 px | Chips, badges, inputs |
| `--r-md` | 8 px | Cards, buttons, popovers |
| `--r-lg` | 12 px | Panels, modals |
| `--r-full` | 9999 px | The iris mark, circular controls, the pupil dot |

Nothing exceeds 12 px except circular elements. Large radii read as consumer-app; this is an instrument.

### 4.3 Elevation — borders first, shadows barely

On a light theme, a 1 px border does most of the work. Shadows are subtle and warm, never grey-black.

| Level | Treatment | Use |
|---|---|---|
| `--e-0` | none | Flat elements inside a panel |
| `--e-1` | 1 px `--line` | Cards, table rows, inputs |
| `--e-2` | 1 px `--line` + `0 1px 2px rgba(26,23,18,0.05)` | Raised cards, hover state |
| `--e-3` | 1 px `--line-strong` + `0 4px 12px rgba(26,23,18,0.08)` | Popovers, dropdowns |
| `--e-4` | 1 px `--line-strong` + `0 12px 32px rgba(26,23,18,0.12)` | Modals, the evidence triptych |

**Never** use a shadow without a border. A borderless shadow on a light background looks like a rendering bug.

---

## 5. Layout

### 5.1 The three-zone shell

```
┌────┬──────────────────────────────────────────┬──────────────┐
│    │  ┌────────────────────────────────────┐  │              │
│ R  │  │                                    │  │   CONTEXT    │
│ A  │  │                                    │  │              │
│ I  │  │          THE PUPIL                 │  │  Evidence    │
│ L  │  │      imagery viewport              │  │  Review      │
│    │  │      (cool neutral well)           │  │  queue       │
│ 56 │  │                                    │  │  Ask panel   │
│ px │  │                                    │  │  Trace       │
│    │  └────────────────────────────────────┘  │              │
│    │  Timeline strip ───────────────────────  │   380 px     │
└────┴──────────────────────────────────────────┴──────────────┘
  ↑                        ↑                          ↑
quietest            most luminous              calm, information-dense
```

| Zone | Width | Content | Visual weight |
|---|---|---|---|
| **Rail** | 56 px fixed | Icon nav: Map, Search, Upload, Review, Audit | Lowest. 20 px line icons at `--ink-3`, active state gets an `--iris-700` 2 px left bar and `--iris-50` background |
| **Stage** | flexible, min 640 px | The map or image canvas, plus the timeline strip below it | Highest. The cool well, full-bleed imagery |
| **Context** | 380 px, collapsible to 48 px | Evidence, review queue, ask, trace | Medium. `--surface` cards on `--bg` |

The stage is never narrower than 640 px. Below 1280 px viewport width the context panel collapses to a slide-over rather than shrinking the stage. **The evidence does not get squeezed to make room for chrome.**

### 5.2 The timeline strip

Fixed at the bottom of the stage, 64 px tall, `--surface` with a `--line` top border.

- One dot per scene, positioned by date on a continuous (not ordinal) axis — **gaps must be visible as gaps.**
- Usable scenes: filled `--orbit-700`, 8 px. Unusable: hollow `--ink-3`, 8 px, with a dotted outline. Hover shows the reason.
- The two scenes currently being compared get an `--iris-700` ring, 14 px.
- Selected change objects project a 1 px `--iris-300` vertical marker at their `first_supported` date.
- `onset_interval` renders as a shaded `--iris-50` band between two dates, with hatched edges. **Uncertainty is drawn as a width, not hidden.**
- ▶ PLAY animates the viewport date left to right at 400 ms per scene, with the ring travelling. Honours `prefers-reduced-motion` — see §8.

The unusable dots are the point. A timeline that shows only usable scenes is a timeline that lies about coverage.

### 5.3 Screen inventory

| Screen | Rail icon | Zones used | Primary action |
|---|---|---|---|
| **Map** (A1, A5, A6, A7) | ◉ | all three | Analyse |
| **Search** (A3, A4) | ⌕ | rail + stage (results grid) + context | Search |
| **Upload** (B1–B4) | ↑ | rail + stage (canvas) + context (metadata, detections) | Upload image |
| **Review** (A13) | ☰ | rail + context (full width list) + stage (preview) | Confirm / Reject |
| **Audit** (A14, A15, A12 calibration) | ⛨ | rail + context full width | Export |

---

## 6. Components

Every component below is specified. Build these; do not invent others without adding them here.

### 6.1 The iris mark (logo)

Three concentric arcs — `--iris-300` outer, `--iris-500` middle, `--iris-700` inner — plus a solid `--iris-900` pupil dot at the centre. Rendered as inline SVG, never as a raster image, never as an external file (offline).

Two sizes: 32 px (rail header) and 20 px (favicon, inline lockup).

**Animation:** on app load only, the three arcs contract inward to the pupil over 600 ms with `cubic-bezier(0.22, 1, 0.36, 1)` — the eye focusing. It plays **once per page load**. It does not loop.

> ⚠️ **Do not animate a blink.** The name says it never blinks. A blinking logo directly contradicts the product promise and someone on the panel will notice.

The pupil dot carries a very slow luminance pulse — opacity 1.0 → 0.82 → 1.0 over 4 s, infinite. This is the "never blinks" signal: continuous, unattended, always open. Disabled entirely under `prefers-reduced-motion`.

### 6.2 The Analyse button — the primary CTA

The only `--iris-700` filled button on the Map screen. 44 px tall, `--r-md`, `--t-body-strong`, `--ink-inverse` label, iris glyph to the left.

On press: a ring contracts from the button edge to its centre over 180 ms (the aperture closing), then the map shows the scan pulse (§6.3).

There is exactly **one** filled iris button per screen. Everything else is `--surface` with a `--line-strong` border.

### 6.3 Scan pulse — the loading state

**Not a spinner.** A ring expands outward from the centre of the region being analysed, `--iris-500` at 2 px, fading from 60% to 0% opacity as it grows from 0 to the region radius, over 1200 ms, repeating.

A closing iris would read as blinking; an expanding scan reads as *looking*. That distinction matters here.

Accompanied by a text status, never alone: *"Comparing 29 scenes…"*, *"Vectorising masks…"*, *"Suppressing false alarms…"*. **The status text must come from real job progress**, not a rotating list of plausible strings. A fake progress message is a lie in the same category as a fabricated number.

### 6.4 Evidence card

The most important component in the product. Vertical order, top to bottom:

1. **The measurement.** `18.43 ha` at `--t-h2` 600, tabular. With a `MEASURED` chip immediately to its right.
2. **The change type.** `Construction` at `--t-h3`, with its colour dot from §2.10.
3. **The onset.** `First supported 9 Jun 2024` at `--t-small`, plus the bracket `±143 days` in `--ink-3`.
4. **The confidence iris** (§6.5), 40 px, right-aligned.
5. **The triptych thumbnail** — before / mask / after, 3 × 88 px wide, 1 px `--line` gaps.
6. **Expand** → rule trace, five confidence components, sources, suppression context, processing history.

Collapsed height ≤ 132 px. Expanded is scrollable within the panel.

Selected card: `--iris-50` background, 2 px `--iris-700` left border. Its polygon on the map simultaneously gets a 3 px `--iris-700` stroke and a white inner halo. **Selection is bidirectional and always visible in both places.**

### 6.5 The confidence iris — radial, not a bar

A 40 px (compact) or 96 px (expanded) radial gauge built from **five concentric arc segments**, one per confidence component, arranged around a central pupil.

```
        ╭─────╮
      ╭─┤ ▂▂▂ ├─╮        outermost arc  = detector_agreement
    ╭─┤ │ ▄▄▄ │ ├─╮      second         = image_quality
    │ │ │ ███ │ │ │      third          = registration
    ╰─┤ │ ▀▀▀ │ ├─╯      fourth         = classification_margin
      ╰─┤ ▔▔▔ ├─╯        innermost      = temporal_persistence
        ╰──●──╯          pupil          = overall (geometric mean)
```

Each arc sweeps `score × 270°` from the 12 o'clock position, clockwise. Arc colour runs `--iris-300` (low) → `--iris-700` (high). The pupil is filled `--iris-900` and displays the overall score in `--t-micro` `--ink-inverse`, or beside the gauge at 40 px where it would not fit.

Hovering an arc highlights it and shows `registration · 0.95` in a tooltip. In the expanded state, all five are listed below with their values and a one-line explanation each.

**Why radial and not a bar:** the overall score is a *geometric mean*, so one bad component sinks the whole thing. A stacked bar hides that. Five arcs around a pupil show it — a single short arc is instantly visible as a gap in the ring, and the pupil visibly darkens. The geometry makes the maths legible.

If `calibrated: false`, the gauge renders at 50% opacity with a dotted outer ring and the label *"uncalibrated"*. **Never show an uncalibrated confidence as if it were calibrated.**

### 6.6 Detection overlay (canvas)

Boxes and polygons drawn on a `<canvas>` over the image, in image pixel space, scaled to display size with `devicePixelRatio` handled explicitly so lines stay 1 device-pixel crisp.

- **Track 1 / 2 (deterministic):** solid stroke, 2 px, class colour at 100%. Polygon fill at 35%.
- **Track 3 (model):** dashed stroke `[6, 4]`, 2 px, class colour at 100%. No fill, or 12% fill.
- Label chip at the box's top-left, outside the box where it fits: `building · 0.87`, `--t-micro`, `--surface` background at 92% opacity, 1 px class-colour border, `--r-sm`.
- Score below 0.7 renders the chip border dotted and the label in `--ink-3`.
- Hit-testing is **smallest-area-first** so a large `building_cluster` box never swallows a small `storage_tank` inside it.
- Hover: stroke widens to 3 px and the corresponding list row highlights.
- Every box carries a 1 px white inner halo so it stays legible over both dark water and bright sand.

### 6.7 The suppression panel

Header: **`312 suppressed`** at `--t-h2`, with `6 retained` beside it in `--ink-3`.

Body: one row per `SuppressionReason`, each showing a dotted `--ink-3` chip, the count in tabular figures, and a proportional bar in `--surface-sunken`. Clicking a row expands three verbatim example reasons from the trace.

**This panel is a headline feature, not a footnote.** Give it the same visual prominence as the change list. Showing what was thrown away is the single most persuasive thing in the demo.

### 6.8 Capability notice

Rendered whenever the Resolution Gate or a `VISUAL_ONLY` upload limits what the system can do. This is **not an error** and must not look like one.

- `--iris-50` background, 1 px `--iris-300` border, `--r-md`, 16 px padding
- An aperture icon (three arcs, `--iris-700`), 20 px, top-left
- Heading at `--t-body-strong` in `--iris-900`: *"Resolution limit"* / *"No location data"*
- Body at `--t-body` in `--ink-2`, using the **verbatim** copy from `feature-specs.md`
- Where a partial answer exists, it renders **below** the notice, not instead of it

Never use `--danger` red for a capability notice. Nothing has gone wrong; the system is correctly reporting what the data supports.

### 6.9 Trace panel

A collapsible tree, `--font-mono` at `--t-mono`, on `--surface-sunken`.

- Nesting indicated by 1 px `--line` vertical guides with 8 px radius corners — **arcs, not right angles**, continuing the iris geometry at small scale.
- Node type glyphs: `⌁` model call, `⛁` SQL, `⚖` verifier, `✕` rejection, `✓` pass
- Verifier `FAIL` nodes render with a `--danger` left border and show both the rejected prose (struck through, `--ink-3`) and the template that replaced it.
- Model request/response bodies are collapsed by default, expandable, and **shown verbatim** — including rejected boxes and their reasons.
- Copy-to-clipboard on every node.

### 6.10 Empty, loading, and error states

Every data component has all three. **Empty is not error.**

| State | Treatment |
|---|---|
| **Loading** | Skeleton in `--surface-sunken`, pulsing opacity 1 → 0.6 over 1.2 s. Shape matches the real content. Never a bare spinner. |
| **Empty** | An **out-of-focus iris**: the three arcs rendered in `--line-strong` at 40% opacity, slightly blurred, with no pupil. Below it, the honest message and, where possible, a suggested next action as a real button. |
| **Error** | `--danger` treatment, the error `code` in `--font-mono`, the `message` verbatim, the `trace_id` in `--t-micro` `--ink-3` and copyable, and a Retry button. **Never a stack trace.** |

The out-of-focus iris for empty states is a deliberate metaphor: *nothing is in focus here yet.* It is also a graceful way to show a screen with no data without it looking broken.

Empty-state copy is written in `feature-specs.md` and `lib/copy.ts`. Examples:

- No changes found → *"No change above the threshold was detected in this window. That is a real result, not a failure — 1 834 candidates were generated and all were suppressed. See the suppression panel for why."*
- No search results → *"Nothing matched. Try a wider date range, a larger area, or fewer filters."*
- No uploads → *"Drop a satellite image here. GeoTIFF works best — I can read its location, resolution and date from the file."*

### 6.11 Tables

- Header: `--t-micro` uppercase `--ink-3`, `--surface-sunken` background, sticky
- Rows: 1 px `--line` bottom border, no zebra striping (zebra competes with the semantic washes)
- Numeric columns right-aligned, `tabular-nums`, `--font-mono` for IDs and coordinates
- Hover: `--surface-hover`
- Selected: `--iris-50` + 2 px `--iris-700` left border
- Null cells render `—` at `--ink-3`. **Never `0`, `null`, `NaN`, or blank.**

---

## 7. Motion

| Token | Duration | Easing | Use |
|---|---|---|---|
| `--m-instant` | 80 ms | `ease-out` | Hover, press, focus |
| `--m-fast` | 160 ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Panel expand, chip appear |
| `--m-base` | 260 ms | same | Card transitions, tab switch |
| `--m-slow` | 600 ms | same | Iris focus on load, triptych open |
| `--m-scan` | 1200 ms | `ease-out` | Scan pulse, looping |
| `--m-pulse` | 4000 ms | `ease-in-out` | Pupil luminance, looping |

Rules:

- **Nothing moves that does not need to.** This is an instrument. Motion communicates state change, never decoration.
- Map panning and zooming use MapLibre's own easing. Do not override it.
- Never animate a number counting up. A measurement appears at its final value. Counting animations imply the number is approximate, which is exactly the wrong signal.
- Never animate a polygon appearing with a bounce or scale. Fade at `--m-fast`, full stop.
- The timeline PLAY is the one place with sustained motion, and it must be pausable and scrubbable.

---

## 8. Accessibility — mandatory, not aspirational

1. **WCAG 2.1 AA minimum, AAA for body text.** All tokens in §2.3 and §2.7 already meet this. Verify any new colour with a contrast check before adding it.
2. **Colour is never the only signal.** Every semantic state pairs colour with a border style, a glyph, or a text label. Enforced by §2.7.
3. **Greyscale test.** Screenshot the map in greyscale. Every land-cover class must still be distinguishable by its secondary mark (§2.8). If two collapse into one, change the mark, not the colour.
4. **Keyboard.** Every control reachable and operable by keyboard. The review queue supports `j`/`k` to move, `c` to confirm, `r` to reject, `e` to expand. Focus is never trapped.
5. **Focus ring.** 2 px `--iris-700`, 2 px offset, `--r-sm`. Visible on every interactive element. **Never `outline: none` without a replacement.**
6. **`prefers-reduced-motion`.** Disables the pupil pulse, the load-time iris focus, the scan pulse (replaced by a static ring plus text), and skeleton shimmer. The app remains fully functional.
7. **Screen reader.** Every map polygon has an `aria-label`: *"Construction change, 18.43 hectares, first supported 9 June 2024, confidence 0.86, measured."* Chips carry their text. The canvas overlay has a hidden DOM equivalent list.
8. **Touch targets** ≥ 40 × 40 px, even though this is a desktop product.
9. **No information conveyed by cursor hover alone.** Hover reveals detail; it never reveals the only copy of a fact.

---

## 9. Basemap and imagery treatment

The default OSM raster style is far too busy and too colourful — it fights the evidence layer.

- **Basemap:** CARTO Positron, or a custom MapLibre style reduced to water, roads, and place labels at `--ink-3`. **No POI icons. No building footprints. No landuse colours.** The basemap is context, not content.
- Basemap labels render *below* the evidence layer, at 70% opacity.
- **Imagery:** true-colour Sentinel-2 (B04/B03/B02) with a 2–98% percentile stretch computed **per scene**, and the stretch parameters stored and shown in the metadata panel. Never a global auto-stretch that changes between views.
- Imagery opacity defaults to 100% over the well, with a slider to blend against the basemap.
- **Offline:** the basemap must come from a local PMTiles file or be absent entirely. Test the app with no basemap — it must still be fully usable, because at the finale it might be.

---

## 10. Copy voice

Short, plain, factual. Second person. Present tense.

| ✅ | ❌ |
|---|---|
| *"No change above the threshold was detected."* | *"Sorry, we couldn't find anything!"* |
| *"This image is 10 m per pixel."* | *"Insufficient resolution for this operation."* |
| *"312 candidates were suppressed."* | *"AI-powered noise reduction applied."* |
| *"First supported 9 Jun 2024"* | *"Construction likely began around mid-2024"* |
| *"I don't know this image's resolution."* | *"Unable to determine GSD."* |

Rules:

- **Never** apologise. Never use "sorry", "oops", "unfortunately".
- **Never** use "AI-powered", "smart", "intelligent", "advanced", "seamless", "revolutionary" in the UI. These words are marketing and they actively reduce trust in a tool whose whole claim is rigor.
- **Never** hedge a measured number ("about 18 ha", "roughly 6 changes"). It was measured. State it.
- **Do** hedge inferred things, explicitly: *"classified as construction based on a rise in built-up index and a fall in vegetation index."*
- **Do** say "I don't know" where the system does not know. It is the most trust-building string in the product.
- All copy lives in `frontend/src/lib/copy.ts`. **Nothing hardcoded in JSX** (`code-standards.md` §3.6). The verbatim messages in `feature-specs.md` are the source of truth; `copy.ts` mirrors them exactly.

---

## 11. Dark mode

**Not supported in v1. Do not build it.**

This will come up, because imagery analysts often prefer a dark environment for inspecting photography, and because someone on the panel may ask. The answer is:

> *"It's a light interface deliberately — long analytical sessions, printed and projected reports, and it keeps the satellite imagery as the only saturated thing on screen. A dark inspection mode is on the roadmap; the token architecture here supports it, since every colour is a semantic token rather than a literal value."*

That answer is only true if §12 is followed. **Use tokens, never hex literals in components** — which is what makes the claim defensible rather than a bluff.

---

## 12. Implementation rules

1. **Every colour, spacing value, radius, shadow, duration, and font size is a CSS custom property** defined once in `frontend/src/app/globals.css`. Tailwind config maps to those tokens. **No hex literals, no `px` magic numbers, no `rgba()` in components.**
2. `frontend/src/lib/palette.ts` exports the class-colour maps (§2.8–2.10) as typed records keyed by the enums in `data-contracts.md` §2. TypeScript must error if an enum value is missing a colour.
3. `frontend/src/lib/copy.ts` exports every user-facing string. Mirrors `feature-specs.md` verbatim. A test asserts the two agree on the capability-notice strings.
4. All icons are inline SVG from a single `components/icons.tsx`. **No icon-font, no external sprite, no CDN** — none of those survive `OFFLINE=1`.
5. The iris mark is a React component taking `size` and `animated`, not an image file.
6. Component states are exhaustive: `loading | empty | error | capability_notice | ok`. A component missing one is incomplete.
7. **Every screen must be screenshotted at the end of the day it is built** and committed to `docs/screenshots/`. You will need them for slides, and you will not remember to take them later.
8. Test at 1280 × 800 (the smallest plausible projector) and 1920 × 1080. Also test greyscale and `prefers-reduced-motion`.

---

## 13. Design acceptance criteria

- [ ] No component contains a hex literal or an arbitrary spacing value
- [ ] The imagery viewport sits in the cool `--map-well` and never touches warm chrome directly
- [ ] `MEASURED` and `INFERRED` are distinguishable with colour removed (border style + glyph)
- [ ] All seven land-cover classes are distinguishable in greyscale via their secondary marks
- [ ] Every number uses `tabular-nums`
- [ ] Every null renders as `—`, never `0`
- [ ] Track 3 detections are dashed, Tracks 1/2 solid, and the legend says so in words
- [ ] A capability notice renders in iris tones, never red, with the verbatim copy from `feature-specs.md`
- [ ] The confidence iris shows five arcs plus a pupil, and dims with an "uncalibrated" label when `calibrated: false`
- [ ] The logo does not blink; the pupil pulses slowly
- [ ] `prefers-reduced-motion` disables the pulse, the load focus, the scan loop, and skeleton shimmer
- [ ] Every interactive element has a visible focus ring; the review queue is fully keyboard-operable
- [ ] Every screen has loading, empty, and error states
- [ ] The app is fully usable with no basemap tiles available
- [ ] चक्षु renders correctly on the demo machine
- [ ] All icons and fonts load with the network disabled
