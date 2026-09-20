# PRD 11 — Control System: Buttons, Inputs, and Every Interactive Element (K)

> **Status:** Authoritative. Extends `ui-context.md` §5 ("Components").
> **Scope:** the exact appearance and behaviour of every interactive control. Placement is `ui-console.md`; this file is styling and state.
> **Work-item IDs:** `K1`–`K9`.
> **Rule:** no control may be styled ad hoc. If a screen needs a control that is not here, add it here first.

---

## 1. Buttons (K1)

### 1.1 Variants

| Variant | Fill | Border | Text | Hover | Active | Use — and only for |
|---|---|---|---|---|---|---|
| `primary` | `--amber` | none | `--amber-deep`, `--t-h2` 700 | `--amber-hot` + 120 ms diagonal sweep | fill `--amber-deep`, text `--amber` | The one viewport action. Max **one** on screen |
| `secondary` | transparent | 1 px `--line-strong` | `--ink-2`, `--t-h2` | border `--amber`, text `--amber`, bg `--amber-wash` at 6% | bg `--amber-wash` | Everything else that is a real action |
| `ghost` | transparent | none | `--ink-3` | text `--ink`, bg `--panel-2` | bg `--panel-3` | Tertiary: `CANCEL`, `SKIP`, `LEARN MORE` |
| `danger-outline` | transparent | 1 px `--danger` | `--danger` | bg `rgba(229,72,77,0.10)` | bg `rgba(229,72,77,0.18)` | `REJECT`, `DELETE`. Never filled red |
| `danger-filled` | `--danger` | none | `#150A0A` | +8% white | −8% | **Confirmation dialog only** |
| `icon-ghost` | transparent | none | `--ink-3`, icon 16 | text `--amber`, bg `--panel-2` | bg `--panel-3` | Copy, close, expand. 28 × 28, hit area 40 × 40 |
| `bar` (dossier bar button) | `--amber`, `skewX(-10deg)` | none | `--amber-deep` 700 | `--amber-hot` | `--amber-deep` | SLOT-02 `DETECT CHANGES` and section headers only |

### 1.2 Sizes

| Size | Height | Padding | Type | Icon | Where |
|---|---|---|---|---|---|
| `sm` | 28 px | 0 10 px | `--t-tag` | 14, gap `--s-1` | chips, row actions, table headers |
| `md` | 36 px | 0 14 px | `--t-h2` | 16, gap `--s-1` | **default everywhere** |
| `lg` | 44 px | 0 20 px | `--t-h2`, +0.02em | 18, gap `--s-2` | landing CTAs, auth submit, mobile action bar |

### 1.3 States — all seven are mandatory

```
default → hover → active → focus-visible → disabled → loading → selected
```

| State | Treatment |
|---|---|
| `hover` | 120 ms `--m-fast`; the sweep for `primary` is a `linear-gradient(105deg, transparent 40%, rgba(255,255,255,.35) 50%, transparent 60%)` translating −120% → 120% once. It does **not** loop |
| `active` | fill darkens one step; `transform: translateY(0.5px)` |
| `focus-visible` | 2 px `--amber` ring, `outline-offset: 2px`, radius `--r-ctl`. Never `outline: none` without replacement. Show on keyboard nav only (`:focus-visible`, not `:focus`) |
| `disabled` | opacity 0.42, `cursor: not-allowed`, no hover effect, **and a tooltip explaining why** (see §1.5) |
| `loading` | label switches to the gerund (`DETECT` → `DETECTING`), a 2 px amber indeterminate bar runs along the button's bottom edge, `aria-busy="true"`, click ignored. **No spinner icon inside a button** |
| `selected` | only for toggles/chips/tabs: `--amber-wash` fill + `--amber` border + amber text |

### 1.4 Label rules

- Verb first, ≤ 2 words: `DETECT CHANGES`, `CONFIRM`, `EXPORT REPORT`, `SWAP`. Never `OK`, `Submit`, `Click here`, `Go`.
- Uppercase via `text-transform`, typed in sentence case in the source (`Detect changes`) so screen readers and translations behave.
- No trailing ellipsis on a button that opens a dialog — the dialog is expected, not surprising.
- A button that destroys something says what it destroys: `REJECT TARGET`, not `REJECT`.
- Labels come from `lib/copy.ts`. Hardcoded strings in JSX are a lint error.

### 1.5 Disabled vs hidden

**Disable, don't hide** — hidden controls make the interface change shape and users cannot learn it. Every disabled control carries a `title` + `aria-describedby` reason from a fixed list:

| Reason code | Copy |
|---|---|
| `no-aoi` | `SELECT AN AOI FIRST` |
| `no-dates` | `BOTH DATES REQUIRED` |
| `same-date` | `DATES MUST DIFFER` |
| `job-running` | `ANALYSIS IN PROGRESS` |
| `offline` | `UNAVAILABLE OFFLINE` |
| `no-selection` | `SELECT A TARGET FIRST` |
| `gate-failed` | `RESOLUTION BELOW 2 m — SEE NOTICE` |
| `permission` | `ADMIN ONLY` |

### 1.6 The button component

`components/ui/Button.tsx` — the only way to render a button. Props: `variant`, `size`, `state`, `icon?`, `iconRight?`, `shortcut?`, `reason?`, `as?`. It renders `<button>` (never `<div onClick>`), sets `aria-busy`/`aria-disabled`, renders the shortcut hint as a `<kbd>` on the right at ≥ 1440 px, and asserts the one-primary rule (§ `ui-console.md` L4).

---

## 2. Text inputs (K2)

| Property | Value |
|---|---|
| Height | 36 (44 in auth/landing) |
| Fill | `--well` |
| Border | 1 px `--line-strong` → `--amber` on focus |
| Radius | `--r-ctl` |
| Type | `--t-body`, `--ink`; placeholder `--ink-3`, never a label substitute |
| Padding | 0 12 px (40 px left when a prefix icon is present) |
| Label | above the field, `--t-tag`, `--ink-3`, gap `--s-1` |
| Help text | below, 11 px, `--ink-3` |
| Error | border `--danger`, message below in `--danger` with the error code in `--t-mono`; **never a red background fill** |
| Focus | 2 px amber ring, offset 1 |

Variants: `text`, `search` (with `⌕` prefix and a clear `×` that appears only when non-empty), `textarea` (min 88 px, vertical resize only), `date` (native `input[type=date]` restyled + `--t-mono`), `number` (tabular, `step` explicit, unit suffix inside the field at right in `--t-tag`).

---

## 3. Selects and menus (K3, K4)

- **K3 `select`:** native `<select>` restyled (keyboard + a11y for free), 36 px, `--well` fill, custom amber caret SVG on the right, value in `--t-body`, and the current value's unit in `--t-mono` `--ink-3` after it (`Koderi · UTM 43N`).
- **K4 `menu` (presets, sort, filter):** `--panel` popover, 1 px `--line-strong`, radius `--r-ctl`, shadow `0 8px 24px rgba(0,0,0,.55)`, `--z-tooltip`. Items 32 px, `--t-body`; hover `--panel-2`; selected item gets a 2 px amber left bar; a `--t-tag` shortcut hint right-aligned per item; dividers 1 px `--line`; max-height 320 px then scroll. Opens **below-left-aligned** to its trigger unless within 320 px of the viewport bottom, then above. Closes on `Esc`, outside click, or selection.

---

## 4. Tabs (K5)

32 px tall, gap 0, equal-width when ≤ 4 items (`flex: 1`) and content-width when more. Inactive `--ink-3` `--t-h2`; hover `--ink`; active `--amber` with a 2 px amber underline that animates from centre outwards over 160 ms (M6). A tab that would show an empty panel is disabled with a reason (§1.5), not hidden. Tabs get `role="tablist"`/`tab`/`tabpanel` and arrow-key navigation.

---

## 5. Toggles, chips, thumbs (K6, K7)

- **K6 `thumb`** (evidence triptych): 1:1 well, 1 px `--line-strong`, label `BEFORE/MASK/AFTER` in `--t-tag` overlaid bottom-left on a `rgba(11,13,16,.72)` scrim; active = amber frame + corner ticks; hover = frame `--line-strong`→`--amber` + 1.04 scale over 160 ms.
- **K7 `chip-toggle`** (year chips, filters): 28 px, `--t-tag` mono, 1 px `--line-strong`, radius `--r-tag`. Selected = `--amber-wash` fill + `--amber` border + `--amber` text. Chips are for **sets** (years, sensors, filters); radios are for **one-of** (export format). Do not use chips for a single binary state — use a `switch` (36 × 20 track, 16 px knob, `--line-strong` off / `--amber` on, 160 ms).

---

## 6. Stats, status, gauges (K8)

- **`stat`:** label `--t-tag` `--ink-3` above, value `--t-figure`-scaled-to-18 cond 700 tabular `--ink`. Unit in `--t-mono` `--ink-3` after the value. Only `MEASURED` values may animate a count-up (M7).
- **`status`:** 8 px dot + `--t-tag` label. teal `LIVE`, amber `DEGRADED`/`OFFLINE`, green `OK`, red `FAILED`, grey `IDLE`. The dot pulses only for `LIVE` (M8, 2 s).
- **Confidence iris:** unchanged from `ui-context.md` §5 — five arcs, amber ramp, `UNCALIBRATED` at 40% opacity with a dotted outer ring.

---

## 7. Feedback surfaces (K9)

| Surface | Position | Timing | Content |
|---|---|---|---|
| **Toast** | bottom-right, above SLOT-40, stack of 3 max, gap `--s-2` | in 160 ms, out 120 ms; auto-dismiss 4 s (errors 8 s); pause on hover | 1-line `--t-body` + optional `UNDO` ghost button on the right. Never a modal toast |
| **Inline validation** | under the field | immediate on blur, then on change | message + code |
| **Skeleton** | in place of content | after 200 ms of waiting, never before | `--panel-2` blocks with a single left-to-right sheen, 1.2 s. **No spinners in panels** |
| **Progress** | SLOT-30 or the button's bottom edge | honest stage labels only | `READING → GATE → TILES → MODEL → VERIFY`. Never a synthetic percentage |
| **Dialog** | centred, `--z-modal`, scrim `rgba(6,8,10,.68)` | in 220 ms | title `--t-h1`, body `--t-body`, footer actions right-aligned per §3. `Esc` closes, focus trapped, focus returns to the trigger |
| **Tooltip** | adjacent, `--z-tooltip` | 400 ms delay in, 0 out | ≤ 6 words, `--t-tag`. Never the only home of required information |

---

## 8. Acceptance criteria

- [ ] `Button.tsx` is the only button renderer; `<div onClick>` and `<a className="btn">` do not exist (grep test)
- [ ] All seven states implemented and visible in `docs/screenshots/controls.png` (a contact sheet of every variant × state)
- [ ] Every disabled control in the app carries one of the eight §1.5 reason strings — no silent disabling
- [ ] No spinner inside any button; loading uses the gerund + bottom bar
- [ ] Focus ring visible on every control under keyboard navigation; `:focus-visible` only
- [ ] Chips for sets, radios for one-of, switch for binary — verified by review, not by convention
- [ ] Toasts never stack above 3, never block SLOT-40, and offer `UNDO` for anything destructive
- [ ] Dialogs trap focus, close on `Esc`, and return focus to the trigger
- [ ] All strings in `lib/copy.ts`; zero hardcoded JSX strings (lint)
