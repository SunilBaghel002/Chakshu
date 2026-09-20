# Claude Code Prompts — Chakshu build, starting with UI/UX

> **⚠ STACK CORRECTION, 20 Sep 2026.** These prompts were written assuming **Next.js 15** and were
> written before the audit found the build is on **Vite 6**. `code-standards.md` §1.1–§1.4 now
> supersedes every Next.js path below:
>
> | Prompt says | Build actually uses |
> |---|---|
> | `app/globals.css` | `frontend/src/index.css` |
> | `next.config.ts` rewrite | `server.proxy` in `frontend/vite.config.ts` |
> | server components / `"use client"` | neither exists — all client-side |
> | server-side role checks | **must be enforced in FastAPI** |
> | MapLibre already present | **Leaflet is present — tasks 8.20–8.22 replace it** |
>
> **Run `PRD/17_build-guide.md` alongside this file.** It is the corrected, Vite-native version of
> prompts 1–4, and it adds the prerequisite tasks 8.0–8.0c that this file assumes were already done.
> Phase 8 Stage A tasks and their gate now live in `build-order.md`.
>
> **How to use this file.** Each block below is one prompt. Paste **one at a time**, in order, in the repo root. Wait for the report, check the "done when" boxes yourself, then start a fresh context (`/clear`) before the next prompt.
>
> Why one at a time: `prd/ai-workflow-rules.md` Rule 3 is *one feature at a time, vertically*. A prompt that says "do the UI, the landing page and the tracking" gets you three half-finished things and a context window full of assumptions.
>
> **Do not restate the specs in your prompts.** `CLAUDE.md` is auto-loaded and points at all 16 PRDs. The prompts below are deliberately short — they say *which* task, *which* files, and *what proves it works*. Detail lives in the PRDs; duplicating it here is how docs and code drift apart.

---

### ⚠ Two files this file references do not exist

1. **`brand/ui-prototype-intel.html`** was never copied into the repo (checked 20 Sep 2026 — there is
   no `brand/` directory). `ui-context.md` §6/§11.4 make it the visual source of truth and the
   tie-breaker for M1–M10 timings. **Until it is supplied, `ui-context.md` §6 is the only source and
   tasks 8.21/8.7 cannot claim their "match the prototype" acceptance criterion.** Supply it, or
   amend `ui-context.md` §11.4 to remove the dependency — do not let a task silently pass without it.
2. **`prd/architecture.md` §11** is referenced below but was never written. `architecture.md` ends at
   §10. Use `14_auth.md` and `15_tracking.md` instead.

Also note the docs live at **`PRD/`** with numeric prefixes (`PRD/09_ui-context.md`), not `prd/ui-context.md`.
Every `prd/…` path in `CLAUDE.md` and the PRDs resolves case-insensitively on Windows but **breaks on
Linux CI**. Pick one convention and apply it everywhere.

## Step 0 — put the docs in the repo (you, not Claude Code)

```bash
# from your repo root
mkdir -p prd brand
cp /path/to/earthlens-research/prd/*.md            prd/
cp /path/to/earthlens-research/brand/ui-prototype-intel.html  brand/
cp prd/CLAUDE.md CLAUDE.md          # repo root — Claude Code loads this automatically
```

If a `CLAUDE.md` already exists at the root, diff it first and keep anything repo-specific (build commands, env quirks) by appending it to the copied one.

---

## PROMPT 0 — Audit before touching anything

**Paste this first.** It writes no product code. Its output is the gap report that makes every later prompt concrete.

````text
Read CLAUDE.md, then prd/ai-workflow-rules.md in full, then prd/project-overview.md.
Do not write or modify any code in this session.

TASK: audit the existing frontend against the design specs, and report.

Read these four specs completely before looking at any code:
  prd/ui-context.md     (v2 · Intelligence Console — look: tokens, type, motion M1–M10, §5.1 overlay, §5.2 five states)
  prd/ui-console.md     (position: slot grid, control maps, spacing/z-index tokens)
  prd/ui-controls.md    (control system: 7 button variants × 3 sizes × 7 states)
  prd/ux-rules.md       (behaviour: latency budgets, click budgets, five states, honesty rules)
Also open brand/ui-prototype-intel.html in a browser. It is the visual source of truth.

Then read the actual frontend code and produce FIVE things:

1. STACK VERIFICATION. State the real versions and libraries in use (framework, router,
   map library, state, styling, any UI kit, any analytics/auth package already present).
   Compare against prd/architecture.md §2/§11 and prd/code-standards.md §1.
   IF THE ACTUAL STACK DIFFERS FROM THE SPECS: STOP after this item and list the
   differences. Do not proceed. Do not "adapt" the specs silently.

2. SLOT MAP GAP TABLE. One row per slot in prd/ui-context.md §4 (SLOT-00 … SLOT-40).
   Columns: slot | what the spec requires | what the code currently does | file:line |
   verdict (MATCHES / PARTIAL / MISSING / WRONG PLACE).

3. CONTROL INVENTORY. Every button, input, select, tab, chip and icon-only control
   currently rendered, with its file:line, and which prd/ui-console.md row it corresponds
   to (or "UNSPECIFIED — needs a slot before it can stay").

4. VIOLATION LIST, each with file:line, grouped:
   - hex literals / arbitrary px values / numeric z-index in components
   - hardcoded user-facing strings not in lib/copy.ts
   - more than one filled amber primary visible in one viewport
   - <div onClick> or anchors styled as buttons
   - spinners, fake percentages, or progress without a real stage name
   - data-bearing regions missing any of the five states (§5.2)
   - refusals/capability notices styled as errors (red)
   - external network requests of any kind (fonts, CDNs, analytics, tile servers)

5. A SEQUENCED PLAN to close the gap, as tasks numbered 8.1 … mapped to
   prd/build-order.md Phase 8 Stage A. For each: files to create/change, what could break,
   and how you will verify it. Estimate each as S (<2 h) / M (half day) / L (a day).
   Flag any task you believe is blocked by something in the backend.

Report only. No code changes, no refactors, no "while I was in there" fixes.
If a spec is silent on something you need, list it under a heading OPEN QUESTIONS
instead of deciding it yourself.
````

**Done when:** you have a slot table with a verdict per slot, a violation list with file:line, and a plan whose task numbers match `build-order.md`. Read the OPEN QUESTIONS yourself — those are the decisions the specs genuinely don't cover, and answering them is your job, not the model's.

---

## PROMPT 1 — Design foundation (task 8.1, 8.3)

Tokens, the two enforced components, and the lint that makes drift impossible. Small on purpose: everything later depends on it.

````text
Implement prd/build-order.md tasks 8.1 and 8.3.
Specs: prd/ui-context.md §2–§3 and §11; prd/ui-console.md §1–§2 (L1, L2);
       prd/ui-controls.md §1 (K1).
Follow the task protocol in prd/ai-workflow-rules.md §3.

Deliver:
1. Every colour, type, spacing, sizing, radius, shadow, duration and z-index token as a CSS
   custom property in frontend/src/index.css (Vite — NOT app/globals.css), named exactly as in
   the specs. Tailwind v4 @theme maps to tokens; no raw values pass through.
2. components/ui/Button.tsx — the only button renderer. 7 variants × 3 sizes × 7 states
   (default, hover, active, focus-visible, disabled, loading, selected), the 8 disabled
   reason strings from ui-controls.md §1.5, shortcut <kbd> hints at ≥1440 px.
3. The lint rules from ui-console.md §8.4: ban arbitrary Tailwind values, numeric z-index,
   hex literals, and hardcoded JSX strings in components/.
4. A contact-sheet route (dev-only) rendering every variant × size × state, and a screenshot
   at docs/screenshots/controls.png.

Do not restyle any existing screen in this task. Do not add dependencies.
Verify: plant one deliberate violation of each lint rule in a scratch file, show that each
fails, then delete the scratch file. Run make check.

Report per §3.10, and list anything in the specs you could not implement as written.
````

**Done when:** lint fails on a planted violation; the contact sheet exists; no screen has been restyled yet.

---

## PROMPT 2 — Console shell on the slot grid (task 8.2)

````text
Implement prd/build-order.md task 8.2.
Specs: prd/ui-console.md §4 (L4), §8 (L8), §3 (L3); prd/ui-context.md §4–§5;
       prd/ui-controls.md §3–§5.
Follow prd/ai-workflow-rules.md §3.

Deliver:
1. components/layout/Slot.tsx — the only slot renderer. Throws in dev on an unregistered id.
2. lib/slots.ts — the registry generated from prd/ui-console.md §4/§5: id, dimensions,
   permitted children, collapse behaviour.
3. ConsoleShell rebuilt on the grid: SLOT-00 marquee, SLOT-01 command bar, SLOT-02 temporal
   bar, SLOT-05 rail, SLOT-10 stage, SLOT-20..26 dossier, SLOT-30 timeline, SLOT-40 status.
   Exact heights (18/56/44/72/24) and widths (56/380) from the spec.
4. primaryOwner context: at most one filled amber control (variant "primary" OR "bar") per
   viewport. A second claimant downgrades itself and console.warns in dev.
5. lib/shortcuts.ts with the full keyboard map from prd/ux-rules.md §6, registered once at
   the shell, conflict-checked in dev.
6. Sticky panel footers per ui-console.md §3 (the reflow ban).

Work against fixtures. Do not wire new backend calls in this task; do not delete existing
feature logic — relocate it into its slot. If existing functionality has no slot in §4/§5,
STOP and list it under NEEDS A SLOT rather than inventing a position for it.

Verify: render the console with the dossier open and assert exactly one primary; assert a
panel footer's offsetTop is identical at three different body content lengths; capture
1920×1080, 1440×900, 1280×800 into docs/screenshots/. Run make check.
````

**Done when:** one primary, non-moving footers, three screenshots, and a NEEDS A SLOT list you have adjudicated.

---

## PROMPT 3 — Map hover: M1–M4 (task 8.4, 8.5) ← the priority ask

````text
Implement prd/build-order.md tasks 8.4 and 8.5.
Specs: prd/ui-context.md §6 (M1–M10) and §5.1; prd/ui-console.md §4 SLOT-10..18;
       prd/ux-rules.md §2 (latency budget) and §7 (honesty rules).
Reference implementation: brand/ui-prototype-intel.html — port its lib/map-fx behaviour into
frontend/src/lib/map-fx.ts. Where this spec and the prototype disagree on a timing or colour,
the prototype wins and you must tell me so I can correct the spec.

Deliver, in this order:
1. M1 cursor reticle + crosshair + live LAT/LON in SLOT-14 (lerp cap 60 ms, fade 140 ms).
2. M2 scan sweep on stage enter (900 ms) + dot-grid glow under the cursor.
3. M3 target lock-on on real change polygons: stroke hot, 4 corner brackets (160 ms, 30 ms
   stagger), skewed dossier tag (140 ms) with a 400 ms count-up, leader line.
4. M4 sector grid label in SLOT-11.
5. Overlay chrome per SLOT-11..18: zoom stack top-right, legend bottom-left (collapsible),
   coordinate readout bottom-right. MapLibre navigationControl: false; attribution compact
   and relocated so the bottom-right 300×40 px is ours.

Hard constraints:
- The count-up in M3 fires ONLY for MEASURED values. Never for INFERRED or UNVERIFIED, and
  never on a loop (ux-rules.md §7.1).
- Overlay rendering follows ui-context.md §5.1 exactly: Track 3 dashed, Tracks 1/2 solid,
  1 px dark inner halo, label collision suppression with "+n LABELS HIDDEN" in SLOT-13,
  sub-pixel boxes drawn as crosshair dots.
- prefers-reduced-motion disables M2 and snaps M1.
- No pointer-driven event may hit the network (telemetry is not built yet).

Verify: hover a real change polygon from the fixtures and record the frame timings; assert
hover→tag ≤100 ms p50 / ≤160 ms p95; assert no count-up on an INFERRED fixture; capture
greyscale and reduced-motion screenshots. Run make check.
````

**Done when:** the lock-on works on real data with measured-only count-up, and the timings are recorded in `PROGRESS.md` §I — not claimed from memory.

---

## PROMPT 4 — Dossier, other screens, five states (task 8.6, 8.7)

````text
Implement prd/build-order.md tasks 8.6 and 8.7.
Specs: prd/ui-console.md §4 SLOT-20..26 and §5; prd/ui-context.md §5, §5.1, §5.2;
       prd/ui-controls.md §7; prd/ux-rules.md §4, §5, §9.

Deliver:
1. Dossier (SLOT-20..26) in the exact order: header+VERIFIED, tabs, measured block,
   triptych, confidence iris, actions footer (EXPORT left / REJECT / CONFIRM primary), trace.
2. The other screens mapped onto the same slots per ui-console.md §5: UPLOAD, REVIEW, ASK,
   SEARCH, plus the export dialog. Slots do not change between screens — only their content.
3. All five states (ok | loading | empty | error | capability_notice, with stale as a
   modifier of ok) for every data-bearing region, using the verbatim copy in lib/copy.ts.
   Refusals render in amber-wash, never red.
4. Delete the anti-patterns listed in prd/ux-rules.md §9: window.alert/confirm, spinners over
   the map, red capability banners, tooltips as the only documentation of an icon,
   confirmation dialogs for reversible actions (use a toast with UNDO).

Verify: for each screen, capture all five states; count the clicks for each flow in
ux-rules.md §5 and record the counts; assert no window.alert/window.confirm remains
(grep); assert every refusal string matches feature-specs.md verbatim. Run make check.
````

**Done when:** the click counts in §5 are met and recorded, and every screen has five captured states.

> **UI/UX is finished here.** Tasks 8.1–8.7 are the whole of Stage A's interface work. Prompts 5–8 are the public surface; run them only once the console passes its gate.

---

## PROMPT 5 — Landing page (task 8.8–8.10)

````text
Implement prd/build-order.md tasks 8.8, 8.9, 8.10.
Spec: prd/landing-page.md (W1–W7), section order and copy are fixed — do not reorder or
rewrite copy. Also prd/ui-console.md §6 for the responsive rule.

Hard constraints:
- Zero external requests. No CDN, no Google Fonts, no analytics script, no embed. Self-host
  or inline everything. Verify by loading the page with the network disabled.
- The hero preview is the real console component with fixtures, labelled
  "LIVE FIXTURE · NOT A SCREENSHOT". A static image is a fallback only.
- Every number on the page must exist in PROGRESS.md §I. If it does not, omit the row.
  No estimates, no "≈", no superlatives (W1.2).
- All six "SEE IT →" deep links must land on a populated console view.
- Exactly one filled amber primary at any scroll position.

Deliver the sections in W2 order, the metadata/OG block from W5, public/og.png, and the
responsive breakpoints from W3. Then deploy and verify the public URL from a fresh browser
profile: no localhost anywhere in client code, no absolute backend URL.
Measure LCP and record it in PROGRESS.md §I.
````

---

## PROMPT 6 — Identity + telemetry (task 8.11–8.16)

````text
Implement prd/build-order.md tasks 8.11 through 8.16.
Specs: prd/auth.md (S1, S2, S5, S6 — Stage A is ANONYMOUS SESSIONS ONLY, no login UI),
       prd/tracking.md (T1–T9), prd/data-contracts.md §10, prd/architecture.md §11.

Stage A scope, exactly:
- The same-origin rewrite via server.proxy in frontend/vite.config.ts (auth.md §2; NOT next.config.ts).
  Relative URLs only in client code. Vite has no server runtime — role checks are FastAPI's job.
- Session middleware: resolve-or-create guest sid, HttpOnly/SameSite=Lax/Secure cookie,
  token stored as SHA-256, GUEST-XXXX label, session/visit/event DDL + migration.
- POST /api/v1/events: enum-validated, batched, rate-limited, bot-filtered, returns 204
  ALWAYS — including on internal failure.
- lib/track.ts: queue, sendBeacon flush, trackOnce, trackAgg; no-op unless
  NEXT_PUBLIC_TELEMETRY=on; one retry then drop.
- Wire ONLY the events in tracking.md §3. map.hover must be aggregated (≤1 per 5 s);
  a pointermove handler emits nothing.
- UA parsing, IP HMAC-hashing, offline GeoLite2 loader that returns NULL when the DB is
  absent. Loopback/private ranges resolve to LOCAL, never a fabricated city.
- The /privacy route with the tracking.md §8 copy VERBATIM, including MaxMind attribution.

DO NOT BUILD: login/signup UI, roles beyond guest, password hashing, OAuth, JWT, any
third-party analytics, GPS prompts, session recording, keystroke or mouse-path capture.
Those are Stage B or banned outright. If you think one is needed, stop and ask.

Verify: first request with no cookie returns a guest session; dev tools show ONE origin for
all /api calls; a 60 s session with 40 interactions produces ≤12 requests; pointing ingest
at a 500 changes nothing user-visible; no raw IP or token_hash in any response, log or table;
missing GeoLite2 DB produces UNKNOWN with no network call. Run make check and make offline.
````

---

## PROMPT 7 — Admin panel (task 8.17, 8.18)

````text
Implement prd/build-order.md tasks 8.17 and 8.18.
Specs: prd/admin-panel.md (D1–D9), prd/auth.md S4/S6 for the role gate.

Stage A scope: the /admin route with OVERVIEW, VISITORS and the detail panel (visit-grouped
action timeline). Role check server-side: guest → 401, analyst → 403, never a redirect loop.
Bootstrap via scripts/make_admin.py; a fresh DB shows "NO ADMIN CONFIGURED", not a 500.
scripts/seed_telemetry.py with the DEMO DATA badge, refusing ENV=prod without --force.
EXPORT CSV with the audit row.

No chart library: use the four inline-SVG primitives in admin-panel.md §5. Every chart has a
table equivalent. No raw IP, no token_hash, no ua_raw anywhere except the detail panel's
DEVICE tab. Every aggregate response returns query_ms and rows_scanned, shown in SLOT-40.

Defer LIVE, OPERATIONS, PAGES, AUDIT views to Stage B.
````

---

## PROMPT 8 — Rehearse and submit (task 8.19)

````text
Implement prd/build-order.md task 8.19 against the Phase 8 Stage-A gate.

Walk the gate checklist line by line and report PASS / FAIL / NOT VERIFIED for each, with the
evidence (command output, screenshot path, or measurement) beside it. "NOT VERIFIED" is an
acceptable answer; "PASS" without evidence is not (prd/ai-workflow-rules.md Rule 6).

Then run the 90-second judge path from prd/ux-rules.md §8 with the network disabled and
report where it breaks. Update PROGRESS.md. Do not mark anything done that you did not run.
````

---

## The daily driver, once the plan exists

````text
Read PROGRESS.md, then pick up the next unblocked task from prd/build-order.md Phase 8.
Announce it per prd/ai-workflow-rules.md §3.1 and wait for my go-ahead before writing code.
````

---

## Four things that will go wrong, and the line that prevents each

| Failure | Add this to the prompt |
|---|---|
| It restyles everything at once and breaks working features | *"Relocate existing functionality into its slot; do not rewrite it. If something has no slot, STOP and list it under NEEDS A SLOT."* |
| It invents a colour, spacing value or z-index | *"Tokens only. Plant a deliberate violation and show me the lint failure."* |
| It claims a number it never measured | *"Record it in PROGRESS.md §I, or report NOT VERIFIED. Never state a timing from memory."* |
| It adds a package to save time | *"Do not add dependencies. If one is genuinely required, stop and name it with its licence per prd/code-standards.md §11."* |

And the one that is easiest to forget: after every prompt, **read the report's deviations and open questions**. The specs cannot cover everything, and the moment a model decides an uncovered case silently is the moment the docs stop describing the product.
