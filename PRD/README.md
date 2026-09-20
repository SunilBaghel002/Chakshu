# PRD Pack — Chakshu

**चक्षु · *the eye***
*The eye that never blinks — from orbit to evidence.*

**9 files that tell Claude Code exactly what to build, how to behave while building it, and how it must look.**

~35,000 words. Written to be read literally, not skimmed.

---

## Setup — do this before anything else

Copy the whole `prd/` folder into the root of your new code repository, then:

```bash
# in the new repo root
cp -r /path/to/earthlens-research/prd ./prd
cp prd/CLAUDE.md ./CLAUDE.md          # Claude Code loads CLAUDE.md from the repo root automatically
```

Then create `PROGRESS.md` at the repo root using the skeleton in **`progress-tracker.md` §4**. That is Phase 0, task 0.13.

⚠️ **Two references will break after the copy.** `feature-specs.md` (lines 9 and 34) and `build-order.md` (line 5) point at `../docs/03-SOLUTION-AND-APPROACH.md` and `../docs/05-BUILD-PLAN-4-DAYS.md`, which live in the research folder, not the code repo. Either copy `earthlens-research/docs/` in alongside `prd/`, or edit those three references to note the file is external. Nothing else depends on them — Group A features are fully summarised in `feature-specs.md` itself.

---

## The files

| # | File | What it is for | Read |
|---|---|---|---|
| — | [`CLAUDE.md`](CLAUDE.md) | **Entry point.** Goes at the repo root. Claude Code loads it automatically. Points at the other sixteen and states the rules that matter most. | 2 min |
| 1 | [`project-overview.md`](project-overview.md) | Name and tagline, what we're building, what's in scope, **what is explicitly out of scope**, the two hard constraints, demo sites, 12 success criteria | 10 min |
| 2 | [`architecture.md`](architecture.md) | System diagram, layering rules, full repo layout, DB schema (runnable DDL), **the Resolution Gate**, three detection tracks, **the three-tier answer stack and the Number Verifier**, cross-cutting concerns, ADRs | 21 min |
| 3 | [`feature-specs.md`](feature-specs.md) | Every feature with an ID, priority, processing steps, **testable acceptance criteria as checkboxes**, edge cases, and verbatim user-facing messages. Group B (the SIH26167 single-image work) is specified in full. | 20 min |
| 4 | [`data-contracts.md`](data-contracts.md) | Exact JSON for Evidence, Upload, DetectionSet, ChangeSummary, Answer. Every enum. Every endpoint. Every error code. The fixture list. **§7 on the Gemini bbox convention is the highest-risk detail in the project.** | 13 min |
| 5 | [`code-standards.md`](code-standards.md) | Pinned versions, ruff/mypy/tsconfig, naming, the domain vocabulary, testing rules, git, dependency gate, upload security, **§15 never-do list** | 12 min |
| 6 | [`ai-workflow-rules.md`](ai-workflow-rules.md) | **How Claude Code must behave.** 8 cardinal rules, the task protocol, the self-review checklist, the handoff protocol, the remote-sensing traps that will bite you, and the five-part test a judge should be able to apply at any moment. | 13 min |
| 7 | [`build-order.md`](build-order.md) | Phases 0–7, task by task, each ending in a **gate that must pass before the next starts**. Dependency graph, critical path, cut order, task sizing. | 13 min |
| 8 | **[`progress-tracker.md`](progress-tracker.md)** | **NEW.** The live state file: the five laws, the status vocabulary, all eleven section definitions, the copy-paste `PROGRESS.md` skeleton, the update protocol, and the anti-patterns. | 8 min |
| 9 | **[`ui-context.md`](ui-context.md)** | The design system, **v3 · Sovereign Console** (deep navy, saffron + ISRO-blue accents, defence classification banner, restricted tricolour rule; supersedes v2's amber-on-black by user directive, 20 Sep 2026): colour tokens with contrast ratios, the fixed slot grid (`SLOT-…` — "a place for every element"), typography, components, the map hover/animation spec M1–M10, accessibility, and copy voice. **The prototype `../brand/ui-prototype-intel.html` is still not in the repo — do not invent it.** | 16 min |
| 10 | **[`ui-console.md`](ui-console.md)** | **NEW.** *Where everything goes.* Spacing/sizing tokens, the z-index ladder, alignment rules, and a **control map for every screen**: each control's slot, position, size, variant and shortcut. Includes the symptom→fix table for the current build's placement bugs and the one-primary-per-viewport rule. | 14 min |
| 11 | **[`ui-controls.md`](ui-controls.md)** | **NEW.** *How every control looks and behaves.* 7 button variants × 3 sizes × 7 mandatory states, inputs, selects, menus, tabs, chips, switches, thumbs, stats, toasts, skeletons, dialogs — plus the eight `disabled` reason strings and the label rules. | 12 min |
| 12 | **[`ux-rules.md`](ux-rules.md)** | **NEW.** The five UX laws, a measured **latency budget** and a **click budget** per flow, first-run behaviour, the five states with verbatim copy, the keyboard map, the honesty rules, the anti-patterns to delete, and the scripted **90-second judge path**. | 11 min |
| 13 | **[`landing-page.md`](landing-page.md)** | **NEW.** The public front door at `/`: fixed section order with verbatim copy, the live-fixture hero, six feature cards that deep-link into populated console views, the evidence table (numbers only from `progress-tracker.md` §I), offline/asset rules, meta/OG, and the only telemetry the page may emit. | 12 min |
| 14 | **[`auth.md`](auth.md)** | **NEW.** Anonymous-first identity: guest sessions created silently, optional email+password login, two roles, the same-origin rewrite that makes cookies work, argon2id, the no-email recovery path, DDL, endpoints, and the §8 list of what is deliberately not built. | 13 min |
| 15 | **[`tracking.md`](tracking.md)** | **NEW.** First-party telemetry. **§2 is the important part: what a browser genuinely cannot tell you** (no device names; city-level IP at best). Closed event taxonomy, `event`/`visit` DDL, the always-`204` ingest endpoint, the batching client, offline GeoIP + UA parsing with licences, retention, exact metric definitions, and the verbatim `/privacy` notice. | 15 min |
| 16 | **[`admin-panel.md`](admin-panel.md)** | **NEW.** `/admin` — the console grid pointed at itself. Six views (`OVERVIEW` `VISITORS` `LIVE` `OPERATIONS` `PAGES` `AUDIT`), the visitor table's exact columns, the visit-grouped action timeline, three inline-SVG chart primitives instead of a chart library, the admin API, and the labelled `DEMO DATA` seeding rule. | 13 min |
| 17 | **[`build-guide.md`](build-guide.md)** | **START HERE to build.** The Vite-native, practical companion to 9–12: the exact token set to add, the `Slot.tsx`/`Button.tsx` shapes, what the MapLibre migration changes, the commands that verify each step, the mistakes the rebuild exists to fix, and the spec gaps to raise rather than decide. **Supersedes the Next.js paths in `Prompts.md`.** | 12 min |


---

## What the seven public-surface files do (added 20 Sep 2026)

Files 10–16 came from one instruction: *the UI's positioning is bad, every button needs a place, and we need a landing page, a login, tracking, and an admin panel.* They are split so that each answers a different question and none has to be re-read to answer another:

| Question | File |
|---|---|
| What does it look like? | 9 · `ui-context.md` |
| **Where does it go?** | 10 · `ui-console.md` |
| **How does each control behave?** | 11 · `ui-controls.md` |
| **How does it feel to use?** | 12 · `ux-rules.md` |
| How do strangers meet it? | 13 · `landing-page.md` |
| Who is this visitor? | 14 · `auth.md` |
| What did they do? | 15 · `tracking.md` |
| How do we see that? | 16 · `admin-panel.md` |

Three things about this set are worth understanding before reading it.

### ⚠ Stack corrections (20 Sep 2026) — read before following any older path

An audit of the built frontend against these specs found the build is **not** on the stack that
`code-standards.md` and `Prompts.md` assumed. Four reversals are now recorded, all in
**`code-standards.md` §1.1–§1.4**, which supersedes older references elsewhere:

| Decision | Was | Now | Because |
|---|---|---|---|
| Framework | Next.js 15 App Router | **Vite 6 + React 19 SPA** | Phases 0–6 are built and gated on Vite |
| Routing | Next.js file routes | **`react-router-dom` v7** | Vite has no file router |
| Map library | MapLibre (assumed present) | **MapLibre — to be installed, replacing Leaflet** | `map-fx.ts` and `useMapPolygons.ts` are on Leaflet and must be rewritten |
| Authorisation | Server components | **FastAPI only** | Vite has no server runtime; a client-side role check is not a gate |

**Consequences you must not miss:** `app/globals.css` → `frontend/src/index.css`; `next.config.ts`
→ `server.proxy` in `vite.config.ts`; `next/image` → plain sized `<img>`; Metadata API → static tags
in `index.html`. The build also currently makes **ten external requests** (Google Fonts, a CDN, six
tile providers) which `OFFLINE=1` forbids — all are listed in §1.4 and are task 8.0b.

**Phase 8 Stage A** now exists in `build-order.md`, with tasks 8.0–8.22 and a gate. **Phase 7 is
deferred until it passes** (user directive, 20 Sep 2026).

**The positioning problem is solved by a rule, not by taste.** `ui-console.md` gives every control a slot, a size, a variant and a shortcut, and bans the three things that make interfaces drift: arbitrary spacing values, invented `z-index` numbers, and panel footers that move when content changes. The single highest-leverage rule is *one signal primary per viewport*, enforced in code by a `primaryOwner` context that downgrades a second primary and warns in dev.

**Three earlier files had to be amended, not just added to.** `project-overview.md` §3.2 excluded user accounts and analytics; `ai-workflow-rules.md` Rule 4 said "do not add authentication"; `code-standards.md` §11 banned telemetry SDKs. All three now carry dated reversal notes, struck through rather than deleted, and each reversal is **narrow**: anonymous-first identity with no OAuth and no email; first-party telemetry with every third-party tracker still banned (an external script would violate SIH26227's "no cloud or external APIs during evaluation" on its own). Reading only the new files and not the reversals will produce a Claude Code session that refuses the work.

**`tracking.md` §2 is the honesty section.** A browser cannot report a device's name, and IP geolocation is city-level at best and useless for `127.0.0.1` — which is exactly what the offline finale demo will produce. The panel therefore shows `DESKTOP · CHROME 141 · WINDOWS` and `Delhi, IN` or `LOCAL`, and never pretends to more. Two related rules follow from it: pointer-driven events are **aggregated** (one `map.hover` per 5 s, not one per `pointermove`), and seeded demo traffic carries a visible `DEMO DATA` badge, because an unlabelled fake analytics panel is the same failure as a fabricated benchmark.

---

## What the two new files do

**`progress-tracker.md`** solves the context-loss problem. A four-day build with six people and an AI assistant loses state constantly — between sessions, between people, across compaction. Without one live file, the same mistake gets made three times and the same question asked five times. It defines a strict status vocabulary (`done` and `verified` are different things), requires evidence for every claim, and has dedicated sections for **negative results**, **tuned thresholds**, and **measured numbers**.

The last of those is a hard gate: *if a number is not in §I, it may not be used in any document, slide, or claim.* That is the mechanism that keeps a hackathon team from accidentally fabricating a benchmark five minutes before the pitch.

**`ui-context.md`** is the design system, and it is prescriptive rather than suggestive — every colour, spacing value, radius, shadow, duration and font size is a named token. Claude Code should never have to choose a hex value.

The core idea: **the map is the pupil; everything else is the iris, arranged around it, getting quieter as it goes outward.** Luminance falls off from the centre of the screen, so the satellite imagery is the brightest and most saturated thing in view and the chrome nearly disappears.

Note on the theme: v1 of this design system specified a light "paper instrument" look. **The user reversed that on 14 Sep** in favour of a dark intelligence-agency console (reference frames supplied), and `ui-context.md` was rewritten as v2 accordingly. What survived the reversal is everything that protects credibility rather than mood: the `MEASURED`/`INFERRED`/`UNVERIFIED` encodings, the greyscale test, tabular numerals, verbatim refusal copy, and the offline font/icon/basemap constraints.

Notable components carried into v2: the **confidence iris** — a five-arc radial gauge, because the score is a geometric mean and one short arc makes a weak component instantly visible; the **target lock-on** hover (corner brackets + dossier tag + count-up ticker), which is the signature map interaction; and the **out-of-focus iris** for empty states — *nothing is in focus here yet.*

---

## The four rules that run through all nine files

1. **The AI never produces a number.** Enforced structurally (three-tier stack + verifier), in the schema (`narrative_facts`, `MeasurementBundle`, `kind: MEASURED | INFERRED`), per feature, and in the UI as a solid-vs-dashed chip encoding that survives colour removal.
2. **Refusals are features, not gaps.** The Resolution Gate, the `VISUAL_ONLY` upload refusal, the verifier fallback, the `unsupported` intent — each has verbatim copy in `feature-specs.md`, a dedicated `capability_notice` state in `ui-context.md` §5.2 that is explicitly *not* styled as an error, and a protecting rule in `ai-workflow-rules.md` §2.
3. **Never weaken a guarantee to make progress.** No deleting tests, no `type: ignore`, no threshold tuned to make one demo case pass. Stated in `code-standards.md` §7 and `ai-workflow-rules.md` §2 in different words, deliberately.
4. **Nothing gets claimed without evidence.** `progress-tracker.md` Law 2 and the §I rule; `ai-workflow-rules.md` Rule 6; and the design acceptance criteria in `ui-context.md` §12.

---

## One thing worth flagging about the visual identity

The iris geometry is strong and I've built the whole system on it. But I'd steer the *all-seeing eye* framing carefully.

An unblinking omniscient eye watching a population is a loaded symbol — the Eye of Providence, the panopticon, a lot of dystopian visual language. For a Ministry of Defence imagery product, leaning hard into it risks reading as something a panel would rather not fund.

The Sanskrit doesn't carry that baggage. **चक्षु is simply sight, perception, the faculty of seeing** — neutral throughout Vedic and Upanishadic usage. So: keep the name, keep the iris geometry, keep the luminous clarity, and frame it as *a precise scientific instrument that does not look away* rather than an eye watching people. `ui-context.md` §1 has a concrete do/don't table for this.

It also happens to be the more defensible pitch. "Continuous coverage that discards nothing silently" is a claim you can demonstrate with the suppression panel. "We watch everything" is a claim that makes a room uncomfortable.
