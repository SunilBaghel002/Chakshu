# PRD 16 — Admin Panel: Who Used It and What They Did (D)

> **Status:** Authoritative. Depends on `auth.md` (S) and `tracking.md` (T).
> **Route:** `/admin`, API under `/api/v1/admin/*`, role `admin` only (S4).
> **Work-item IDs:** `D1`–`D9`.
> **The question this panel answers:** *"Did anyone actually look at this? Which operations did they run? Where were they and on what device?"* Everything in it exists to answer one of those four, and nothing else is in scope.

---

## 1. Layout — the console grid, reused (D1)

The admin panel is a console screen, not a new design. Same slots (`ui-context.md` §4), same tokens, same control system. A judge who has just seen the console should feel the panel is the same machine looking at itself.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ SLOT-00  TELEMETRY STREAM (live event marquee, 1 line)            18 px    │
├────────────────────────────────────────────────────────────────────────────┤
│ SLOT-01  [lockup · ADMIN tag] [RANGE ▾ 24h/7d/30d/all] [SEARCH] ·· [N VISITORS][N VISITS][ACTIVE n] │
├────────────────────────────────────────────────────────────────────────────┤
│ SLOT-02  FILTER BAR: [device ▾][country ▾][op ▾][entry path ▾][bot ▾] · [RESET] · [EXPORT CSV] │
├────┬───────────────────────────────────────────────────┬───────────────────┤
│-05 │ SLOT-10  MAIN TABLE / CHART AREA                  │ SLOT-20..26       │
│rail│  (per view, §3)                                   │ DETAIL PANEL      │
│OVER│                                                   │ 20 header         │
│VISI│                                                   │ 21 tabs           │
│LIVE│                                                   │ 22 measured       │
│OPS │                                                   │ 23 device/geo     │
│PAGE│                                                   │ 24 timeline       │
│AUDI│                                                   │ 25 actions        │
├────┴───────────────────────────────────────────────────┴───────────────────┤
│ SLOT-30  ACTIVITY STRIP: 24 h × 30 min buckets, events per bucket  72 px   │
├────────────────────────────────────────────────────────────────────────────┤
│ SLOT-40  rows scanned · query time · retention · GeoLite2 attribution      │
└────────────────────────────────────────────────────────────────────────────┘
```

Rail order (SLOT-05): `OVERVIEW` `VISITORS` `LIVE` `OPERATIONS` `PAGES` `AUDIT`, then divider, then `SETTINGS` bottom-anchored. Shortcuts `G` then `1`–`6`.

**`DEMO DATA` badge:** if any row in `event` came from `scripts/seed_telemetry.py`, SLOT-01 shows an signal chip `DEMO DATA` with a tooltip `SEEDED FIXTURE EVENTS · NOT REAL TRAFFIC` (§7). This is non-negotiable: showing fabricated traffic to a judge without labelling it is the same class of failure as fabricating a benchmark.

---

## 2. SLOT-01 / 02 controls (D2)

| # | Control | Position | Variant | Notes |
|---|---|---|---|---|
| 01.1 | Lockup + `ADMIN` tag | left | static | tag in `--danger`? No — `--signal`, `--t-tag` |
| 01.2 | `RANGE ▾` | left, gap `--s-3` | `select` | `LAST 24 H` `7 D` `30 D` `ALL` `CUSTOM…`; default `7 D` |
| 01.3 | Search | gap `--s-3` | `search` 240 px | matches session label, email, path, event name |
| 01.4 | spacer | — | — | |
| 01.5 | `stat` × 3 | right group | `stat` | `VISITORS` / `VISITS` / `ACTIVE NOW` (ion dot if > 0) |
| 01.6 | Account chip | far right | `chip` | must show the admin's name, not `GUEST-…` |
| 02.1–02.5 | Filters | left, gap `--s-2` | `select` / `chip-toggle` | device, country, operation, entry path, `INCLUDE FILTERED BOTS` toggle (default off) |
| 02.6 | `RESET` | right of filters | `ghost` | clears 02.1–02.5 only, never the range |
| 02.7 | **`EXPORT CSV`** | far right | **`primary`** — the panel's only primary | exports the current filtered view; writes an `audit` entry |

Filters are **AND**-ed, reflected in the URL query string (shareable, survives refresh), and every one of them shows its active value in the chip's own label rather than a generic `FILTER`.

---

## 3. Views (D3)

### D3.1 `OVERVIEW`
Four zones, fixed positions:

1. **KPI row** (top, 5 equal cards, 88 px tall): `VISITORS` · `VISITS` · `MEDIAN DWELL` · `OPERATIONS RUN` · `ERROR RATE`. Each: label `--t-tag`, value `--t-figure` tabular, delta vs previous equal period as `+12%` in `--ok`/`--danger` with `n=` beneath in `--ink-3`. A delta with no previous-period data renders `—`, never `+∞`.
2. **OPERATIONS BREAKDOWN** (left, 60% width): horizontal `BarRow` per op — name, bar scaled to max, count, p50/p95 duration, success %. Sorted by count desc. This is the direct answer to "what operations did they perform".
3. **DEVICE & LOCATION** (right, 40%): two stacked lists — `DEVICE` (`DESKTOP 41 · MOBILE 7 · TABLET 1 · BOT 12 filtered`) and `LOCATION` (`IN · Delhi 9 / IN · Haryana 4 / UNKNOWN 3 / LOCAL 1`). Country + city only; never coordinates.
4. **ENTRY & EXIT** (bottom, two columns): entry path counts, exit path counts, and `DROPPED AFTER LANDING: n (x%)`.

### D3.2 `VISITORS` — the session table (the "who" view)

| Column | Width | Format | Sort |
|---|---|---|---|
| `SESSION` | 140 | `GUEST-7F3A` mono; signed-in rows show display name + `USER` chip | — |
| `FIRST SEEN` | 140 | `20 Sep, 09:41` + relative `· 3 h ago` in `--ink-3` | default desc |
| `LAST SEEN` | 130 | same | yes |
| `VISITS` | 70 | tabular right | yes |
| `EVENTS` | 80 | tabular right | yes |
| `OPS` | 160 | compact chips: `CHG 2 · ASK 5 · SRCH 1` | — |
| `DEVICE` | 200 | `DESKTOP · CHROME 141 · WINDOWS` | yes |
| `LOCATION` | 160 | `Delhi, IN` / `LOCAL` / `UNKNOWN` | yes |
| `ENTRY` | 140 | path, mono, truncated left | — |
| `STATE` | 90 | `ACTIVE` ion · `IDLE` grey · `SIGNED UP` signal | yes |

Row height 36, hover per M6 (2 px shift + signal bar), click selects → SLOT-20 detail. Cursor pagination, 50 rows, `LOAD MORE` secondary at the table footer (never infinite scroll in a data table — it destroys the scrollbar as a position indicator). Empty state: `NO VISITORS IN THIS RANGE · WIDEN THE RANGE OR SHARE THE LINK`.

### D3.3 `LIVE`
Auto-refresh every 10 s (poll, no websockets — a websocket adds a component for zero benefit at this scale). Shows: `ACTIVE NOW` count in `--t-figure`, the last 20 events as a monospace feed (`09:58:12  GUEST-7F3A  op.result  change_detect  ok  8.4s`), and a 60-bucket activity strip. A `PAUSE` toggle (secondary) stops polling; it defaults to paused when the tab is hidden. SLOT-00 marquee mirrors this feed.

### D3.4 `OPERATIONS`
Per-op rows expandable to show: count, success rate, p50/p95/max duration, error codes with counts, and the params distribution (`{preset:"latest"}` n=12). Plus a **completion funnel** for the primary path: `LANDING → CONSOLE → DATES SET → DETECT → HOVER TARGET → DECISION → EXPORT`, with counts and % drop at each step. Steps are computed from the §3 event names in `tracking.md`; the funnel definition lives in code as one array so it cannot drift from the docs.

### D3.5 `PAGES`
`path` × (`views`, `visitors`, `median dwell`, `scroll depth p50` for `/`, `cta clicks` for `/`). Landing-page sections from `landing.section.view` render as a small vertical bar list showing how far people get — that is the "is anyone reading this" answer.

### D3.6 `AUDIT`
Not new telemetry: the existing `A14` audit log (decisions, exports, admin actions), with the session/user column joined in. Read-only. Kept in the same panel so the analyst trail and the usage trail are one screen apart.

---

## 4. Detail panel — SLOT-20…26 (D4)

Selecting a row opens the visitor dossier. Same slot order as the console dossier.

- **20 header:** `GUEST-7F3A` or name/email, `USER`/`GUEST` chip, first-seen, `COPY SESSION ID` icon button.
- **21 tabs:** `TIMELINE` `OPERATIONS` `DEVICE` `RAW`.
- **22 measured block:** `EVENTS 42 · VISITS 2 · DWELL 6m 12s · OPS 7 · ERRORS 0` — tabular, right-aligned values.
- **23 device/geo:** `ua_raw` in a mono well (this is the only place the raw string appears), parsed fields as label/value rows, `screen`, `dpr`, `tz`, `ip_hash` prefix `9f2c…` with the note `HASHED · NOT AN ADDRESS`, `geo_city/region/country`, `referrer_host`.
- **24 timeline:** the action replay — a vertical list, newest first, grouped by visit with a visit header (`VISIT 2 · 20 Sep 09:41 → 09:47 · ENTRY /`). Each row: `HH:MM:SS` mono `--ink-3`, an 14 px icon per event family (nav / op / decision / map / auth / error), the event name in cond, and the salient payload field in `--t-mono`. Filters: `OPS ONLY` `DECISIONS ONLY` `ERRORS ONLY` chip-toggles. Hovering a row highlights it and shows the full `p` JSON in a tooltip.
- **25 actions:** `EXPORT SESSION CSV` secondary · `CLEAR SESSION DATA` danger-outline (revokes the session; confirmation dialog, irreversible) · close `×`.
- **26 raw:** paginated raw event JSON for debugging, mono 11 px, `--well` background.

---

## 5. Charts without a chart library (D5)

`code-standards.md` §11 bans heavy UI additions and `ui-context.md` §11.2 requires inline SVG. So: **no Recharts, no D3, no Chart.js.** Three hand-rolled components in `components/admin/charts.tsx`:

| Component | Props | Renders |
|---|---|---|
| `Sparkline` | `values:number[]`, `w`, `h` | polyline, 1.5 px `--signal`, last point dot, `--signal-wash` area fill at 12% |
| `BarRow` | `label`, `value`, `max`, `meta?` | label 120 px, bar flex (`--signal` 80% height 8 px, `--panel-2` track), value right tabular |
| `Split` | `parts:{label,value}[]` | stacked single-row bar with a legend list beneath; segments in the §2.5 data palette |

No animation on data marks except a 220 ms width transition on first paint. No tooltips that hide the number — the number is always printed. **Every chart has a table equivalent** (either visible or behind a `TABLE` toggle): a chart that cannot be read as numbers is decoration.

---

## 6. API (D6)

| Method | Path | Returns |
|---|---|---|
| `GET` | `/admin/overview` | `{range, kpis:{…}, ops:[…], devices:[…], locations:[…], entry:[…], exit:[…], seeded:boolean, filtered_bots:n}` |
| `GET` | `/admin/sessions` | `?range=&device=&country=&op=&entry=&q=&cursor=&limit=50` → `{items:[SessionRow], next_cursor, total}` |
| `GET` | `/admin/sessions/{id}` | `SessionDetail` (§4 fields incl. `ua_raw`) |
| `GET` | `/admin/sessions/{id}/events` | `?visit_id=&family=&cursor=` → `{items:[Event], next_cursor}` |
| `GET` | `/admin/live` | `{active_now, events:[last 20], buckets:[60]}` |
| `GET` | `/admin/ops` | `{ops:[…], funnel:[{step,count,pct}], errors:[{code,n}]}` |
| `GET` | `/admin/pages` | `{pages:[…], sections:[…]}` |
| `GET` | `/admin/export.csv` | same filters as `/admin/sessions`; `Content-Disposition: attachment`; writes an `audit` row |
| `DELETE` | `/admin/sessions/{id}` | revoke + purge that session's events; audit row |

All require `role=admin` (S4). All are read-only except the last. All responses include `query_ms` and `rows_scanned`, rendered in SLOT-40 — an admin panel that hides its own cost is how you end up with a full-table scan during a demo.

Query rules: every list query is `LIMIT`-ed and cursor-paginated on `(ts, id)`; every aggregate is constrained by the range index; no `SELECT *` from `event` without a `session_id` or `name` predicate; counts use the covering indexes in `tracking.md` §4.

---

## 7. Seeded demo data (D7)

At a finale nobody will have used the link for long, and an empty analytics panel looks like a feature that does not work. So:

- `scripts/seed_telemetry.py --visitors 40 --days 7` generates a plausible dataset: realistic device/geo mix, varied ops, a funnel with honest drop-off, a couple of errors, and 2 signed-up users.
- Seeded rows are tagged `event.p.seeded = true` and the session gets `label` prefixed `DEMO-`.
- The `DEMO DATA` badge (D1) appears whenever any seeded row is in range, and `EXPORT CSV` adds a `seeded` column.
- **Seed only on a demo/staging database.** `scripts/seed_telemetry.py` refuses to run when `ENV=prod` unless `--force` is passed, and prints what it is about to do first.
- If real traffic exists, say so in the pitch: "n real visitors, plus seeded data so you can see the panel working." Do not blend them silently.

---

## 8. Performance and failure modes (D8)

| Situation | Behaviour |
|---|---|
| `event` empty | Every view renders its empty state with a real instruction (`SHARE THE LINK · /`), not a blank table |
| Range contains 100 k+ events | Aggregates still return < 800 ms (indexes); `SLOT-40` shows `query_ms`; a `SLOW QUERY` signal chip appears over 1 s |
| Ingest down | Panel shows `INGEST OFFLINE · LAST EVENT 09:41` in SLOT-00, signal |
| GeoLite2 missing | `LOCATION` column shows `UNKNOWN` and SLOT-40 shows `GEOIP DB NOT INSTALLED` with the script name |
| Non-admin hits `/admin` | 403 page: `ADMIN ONLY` + `RETURN TO CONSOLE`. Never a redirect loop, never a blank screen |
| No admin configured | `NO ADMIN CONFIGURED · RUN scripts/make_admin.py` (S4) |

---

## 9. Acceptance criteria (D9)

- [ ] `/admin` rejects guests (401) and analysts (403) server-side; the rail hides nothing that the API does not also block
- [ ] All six views render from the slot grid with no unslotted element
- [ ] Filters are AND-ed, persisted in the URL, and survive refresh
- [ ] Visitor table columns, widths and formats match §3.2; cursor pagination, no infinite scroll
- [ ] Detail timeline groups by visit and renders 500 events without jank (virtualised above 200 rows)
- [ ] Funnel step definitions live in one array, asserted against `tracking.md` §3 event names by a test
- [ ] No chart library in `package.json`; the three SVG components have table equivalents
- [ ] `DEMO DATA` badge appears whenever seeded rows are in range; seeded rows are labelled in CSV export
- [ ] Every aggregate query returns `query_ms` and `rows_scanned`, displayed in SLOT-40
- [ ] `EXPORT CSV` writes an audit row and respects the active filters
- [ ] Raw IP and `token_hash` appear nowhere in the panel, including the `RAW` tab
- [ ] `LIVE` polling pauses on tab hide and on the `PAUSE` toggle
- [ ] MaxMind attribution rendered in the panel footer
- [ ] Overview KPIs show `n=` under every delta and `—` when no comparison period exists
