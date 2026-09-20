# PRD 13 — Landing Page (W)

> **Status:** Authoritative.
> **Scope:** the public front door at `/`. Not the console. Same design tokens (`ui-context.md` v3), different layout system — the console grid does not apply here.
> **Work-item IDs:** `W1`–`W7`.
> **Purpose, in one line:** in 20 seconds a stranger must know *what it does*, *that it is real*, and *that it runs with no internet* — and have an obvious way in.

---

## 1. Rules (W1)

1. **One route, one deploy.** `/` is the landing page, `/console` is the app, `/admin` is the panel, `/privacy` is the notice. Same Vite app, same tokens, no second site. (Vite + `react-router-dom`, not Next.js — `code-standards.md` §1.1/§1.2.)
2. **No marketing claim without a number, and no number without a source.** Every figure on this page must exist in `progress-tracker.md` §I (measured numbers). If it is not there, it does not appear. Superlatives ("revolutionary", "state-of-the-art", "world's first") are banned — see `FEATURE-PROVENANCE.md` §8.
3. **Show the product, not a picture of the product.** The hero and the demo section embed the *real* console components with fixture data. A static screenshot is a fallback, never the plan.
4. **Works offline.** No CDN, no Google Fonts, no analytics script, no YouTube embed, no external image. Everything is self-hosted or inline SVG. If the page needs the network to look right, it is broken — the finale demo has the network disabled.
5. **Fast.** LCP ≤ 1.2 s p50 / 2.5 s p95 on the demo machine; ≤ 180 KB of JS for the landing route; no client component except the demo, nav, and tracker.
6. **Legible on a projector.** Minimum body size 15 px, section titles 32–48 px, contrast per `ui-context.md` §8. The reference frames are cinema; the landing page is a brochure read from three metres away.

---

## 2. Section order and content (W2)

Fixed order. Sections may be cut from the bottom up if time runs out — never reordered.

### W2.0 · NAV — sticky, 64 px, `--bg` at 88% + 12 px backdrop blur, 1 px `--line` bottom
```
[lockup चक्षु CHAKSHU]······[PLATFORM][HOW IT WORKS][EVIDENCE][OFFLINE]······[SIGN IN ghost][OPEN CONSOLE primary]
```
Left pad 24, link gap 24, right gap 12. Below 900 px the four links collapse into a `MENU` ghost button opening a full-width dropdown. `OPEN CONSOLE` is the page's **only** primary button while the nav is visible (the hero CTA is `bar`-variant signal, so there is still exactly one filled signal control — enforce with the same `primaryOwner` mechanism as the console).

### W2.1 · HERO — min-height 88 vh, two columns 5/7 above 1024 px
Left column, top-aligned at 22 vh:
- Eyebrow, `--t-tag` signal: `SIH 2026 · PS SIH26227 (MoD) + SIH26167 (ISRO/SAC)`
- H1, 48/52 cond 700: **`THE EYE THAT NEVER BLINKS`**, second line in `--signal`: **`FROM ORBIT TO EVIDENCE.`**
- **3 px tricolour rule (`ui-context.md` §5.8) across the top edge of the hero** — one of only three permitted placements
- Sub, 17/26 `--ink-2`, max 52 ch: `Chakshu turns multi-year satellite imagery into measured, auditable change evidence — and answers questions about it in plain language. Fully on-prem. Runs with the network disabled.`
- CTAs, gap 12: **`OPEN THE CONSOLE`** (`bar`, 44 px, `→`) · **`SEE HOW IT WORKS`** (`secondary`, 44 px, scrolls to W2.3)
- Trust row, `--t-tag` `--ink-3`, gap 16: `NO CLOUD` · `NO THIRD-PARTY TRACKERS` · `MODEL LICENCES DECLARED` · `CPU ONLY`

Right column: **the live console preview** — the real map stage component at 0.9 scale inside a `--well` frame with corner ticks, running the fixture AOI, with M2 scan sweep on enter and one polygon auto-hovered after 1.4 s so the lock-on tag (M3) is visible without the visitor moving the mouse. Overlay caption bottom-left, `--t-tag`: `LIVE FIXTURE · NOT A SCREENSHOT`.

Background: dot grid `--bg-grid` + one ghost numeral `01` at `--ink-ghost`, top-right, 96 px. No photographs.

### W2.2 · TICKER — 32 px, full width, `--panel`, 1 px `--line` top+bottom
A single slow marquee (M8) of *facts*, not slogans, each separated by `//`:
`10 m Sentinel-2 archive // change types: appear · disappear · expand · contract // suppression reasons shown, never hidden // vector search in Postgres, no extra database // GeoTIFF + COG ingestion // runs with network disabled //`

### W2.3 · HOW IT WORKS — 5 steps, horizontal above 1024 px, vertical below
Numbered `01`–`05` in `--t-ghost`-style signal-deep numerals, each with an inline SVG icon, a cond title and one `--ink-2` sentence:

1. **INGEST** — `GeoTIFF and COG scenes enter the archive; each gets a checksum and a provenance record.`
2. **GATE** — `The Resolution Gate measures actual ground sampling distance and decides what the system is allowed to claim about this image.`
3. **DETECT** — `Three tracks: a deterministic land-cover index, WorldCover labels, and a vision model for objects. Deterministic first.`
4. **VERIFY** — `Every number is recomputed from geometry in the measurement CRS. If the model says "about 40 buildings", the verifier says what it actually measured.`
5. **DECIDE** — `An analyst confirms or rejects; the decision, the reason and the trace are written to an audit log and exported with the report.`

Below the steps, the full pipeline diagram (`brand/chakshu-pipeline-slide.png`, or inline SVG if time permits), 1 px `--line` frame, `--t-tag` caption `ARCHITECTURE · FULL VERSION IN THE SUBMISSION`.

### W2.4 · FEATURES — 6 cards, 3 × 2 above 1024 px, 2 × 3 at 768, 1 column below
Card: `--panel` fill, 1 px `--line`, `--r-panel`, padding 20, corner ticks on hover only, hover = border `--signal` at 40% + 2 px lift over 160 ms. Icon 20 px signal, title cond 17, body 14/21 `--ink-2` (max 3 lines), footer link `SEE IT →` in `--t-tag` that deep-links into the console with a preset:

| Card | Title | Deep link |
|---|---|---|
| 1 | `SEMANTIC SEARCH` — `Find scenes by meaning, not just by date and cloud cover.` | `/console?view=search` |
| 2 | `CHANGE DETECTION` — `Appear, disappear, expand, contract — with the earliest observation interval.` | `/console?view=map&preset=change` |
| 3 | `FALSE-ALARM SUPPRESSION` — `Suppressed candidates are shown with reasons and counts. Precision over recall.` | `/console?view=map&tab=suppressed` |
| 4 | `ASK` — `Plain-language questions answered with a trace and a confidence tier.` | `/console?view=ask` |
| 5 | `UPLOAD & DETECT` — `Drop a GeoTIFF or a drone frame; get labels, boxes and highlights.` | `/console?view=upload` |
| 6 | `AUDIT & EXPORT` — `Decisions, provenance and model BOM exported with the report.` | `/console?view=audit` |

**Deep links must work.** A `SEE IT →` that lands on an empty console is worse than no link: each preset pre-selects the demo AOI and the relevant dates.

### W2.5 · THE DEMO — full-bleed, `--well` background, min-height 70 vh
The interactive swipe: the real before/after component at full width with the draggable handle (SLOT-18 behaviour) and hover lock-on. Left overlay panel, 380 px, `--panel` at 92%:
- Title `TRY IT` (`--t-h1`)
- Three instructions in `--t-tag` rows with signal numerals: `01 DRAG THE HANDLE` · `02 HOVER A CHANGE` · `03 READ THE MEASUREMENT`
- Below: the live readout of whatever the visitor is hovering (area, type, confidence, onset) — the same dossier tag data.
- Footnote, 12 px `--ink-3`: `Fixture data from the demo AOI. No network calls.`

### W2.6 · EVIDENCE — a table, not a chart wall
Two columns: `WHAT WE MEASURED` and `VALUE`, plus `SOURCE`. Rows come **only** from `progress-tracker.md` §I — e.g. detection F1 on the demo AOI, suppression rate, mean analysis time, index build time, incremental ingest time. Every row's `SOURCE` cell names the eval script (`scripts/bench.py`) and the report file. If a metric was not measured, the row is absent — **no estimates, no "≈", no "expected"**.

Beneath the table, one signal-wash panel: `WHAT WE DID NOT BUILD` listing the declared gaps verbatim from `project-overview.md` §3.2 (SAR processing, model training, 3D). Declaring gaps on the landing page is a credibility play with domain judges, not a weakness.

### W2.7 · OFFLINE / SOVEREIGNTY — two columns
Left: `RUNS WITH THE NETWORK DISABLED` and a checklist with green ticks: tiles served locally (PMTiles) · weights packaged with licence + origin · no external APIs at eval time · fonts and icons inline · GeoIP database bundled, no lookup service.
Right: `MODEL BILL OF MATERIALS` — a small table (model, version, licence, source, size) generated from `/api/v1/meta/models`. Include the `DEPENDENCIES.md` link.

### W2.8 · TEAM + FOOTER
Team `BEYOND ORBIT`, six names, roles in `--t-tag`. Footer 3 columns: product links · `PRIVACY & TRACKING NOTICE` (`/privacy`) · `SIH26227 / SIH26167` references. Bottom line, 12 px `--ink-3`:
`© 2026 BEYOND ORBIT · BUILT FOR SMART INDIA HACKATHON 2026 · NO THIRD-PARTY TRACKERS ON THIS SITE`

---

## 3. Responsive (W3)

| Width | Layout |
|---|---|
| ≥ 1280 | max-width 1200 px content, 24 px gutters, all sections as specified |
| 900–1279 | hero 5/7 → 1 column, preview below the copy; features 2 × 3 |
| 600–899 | nav links collapse to `MENU`; how-it-works vertical; evidence table scrolls horizontally |
| < 600 | hero H1 34/38; CTAs full-width stacked (primary first); demo section keeps the swipe but the overlay panel becomes a bottom sheet |

The console still refuses < 1024 px (`ui-console.md` L6); the landing page does not — it is the fallback destination for a phone user, and must say so: `THE CONSOLE NEEDS A DESKTOP · YOU ARE ON THE OVERVIEW`.

---

## 4. Assets (W4)

| Asset | Source | Rule |
|---|---|---|
| Iris lockup | inline SVG React component | never a PNG; must render offline |
| Section icons (6 + 5) | inline SVG, 1.5 px stroke, `currentColor` | no icon font, no CDN |
| Pipeline diagram | `brand/chakshu-pipeline-slide.png` (or inline SVG) | committed to `public/diagrams/` |
| Console preview | real component + fixtures | screenshot only as a fallback, `public/hero-fallback.png` |
| Fonts | system stack per `ui-context.md` §3 + self-hosted `Noto Sans Devanagari` subset for `चक्षु` | **no `<link>` to fonts.googleapis.com** — it fails silently at the finale |
| OG image | `public/og.png` 1200 × 630, generated once from the hero | required: the link gets shared in WhatsApp and needs a preview |

---

## 5. Meta, SEO, sharing (W5)

```
title:       Chakshu — from orbit to evidence | Beyond Orbit · SIH 2026
description: On-prem satellite change intelligence for SIH26227 (MoD) and SIH26167 (ISRO/SAC).
             Measured, auditable change evidence and plain-language answers. Runs offline.
og:title / og:description / og:image (/og.png) / og:type=website
twitter:card=summary_large_image
theme-color: #0B0D10
canonical:   set from NEXT_PUBLIC_SITE_URL
robots:      index,follow  (do NOT noindex — the submission is a link)
```

Metadata is static `<head>` tags in `frontend/index.html` (there is no Next.js Metadata API on Vite — `code-standards.md` §1.1). Route-specific `<title>`/`description` are set from a small effect in the route component.

---

## 6. Telemetry hooks (W6)

The landing page emits events per `tracking.md` §3. Exactly these, and no more:

| Event | When |
|---|---|
| `page.view` | route render, once per navigation |
| `landing.cta.click` | any CTA, with `{cta:"hero_console"|"hero_how"|"nav_console"|"card_see_it","card":n?}` |
| `landing.demo.interact` | first swipe drag or first polygon hover per session (once, not continuously) |
| `landing.section.view` | section enters viewport ≥ 50% for ≥ 800 ms, once per section per session |
| `scroll.depth` | at 25/50/75/100%, once each |

**Banned on this page:** mouse-move tracking, keystroke capture, cursor heatmaps, session recording, third-party scripts of any kind. If a judge views source and finds a tracker they were not told about, the whole submission loses credibility. The `/privacy` notice names every event in this table.

---

## 7. Acceptance criteria (W7)

- [ ] `/`, `/console`, `/admin`, `/privacy` all served by one Vite build with one deploy
- [ ] Zero external requests on the landing route (verified with the network tab filtered to third-party, and by loading with the network off)
- [ ] LCP ≤ 1.2 s p50 on the demo machine, recorded in `progress-tracker.md` §I
- [ ] Hero preview is the live component with fixtures, labelled `LIVE FIXTURE · NOT A SCREENSHOT`
- [ ] All six `SEE IT →` deep links land on a populated console view
- [ ] Every number on the page traces to `progress-tracker.md` §I; every superlative removed
- [ ] `WHAT WE DID NOT BUILD` panel present with the declared gaps
- [ ] Model BOM table renders from `/api/v1/meta/models`
- [ ] `og.png` present; WhatsApp/LinkedIn preview verified
- [ ] Exactly one filled signal primary visible at any scroll position
- [ ] Responsive at 1440 / 1024 / 768 / 390 with screenshots committed
- [ ] `prefers-reduced-motion` disables the marquee, the scan sweep and the auto-hover
