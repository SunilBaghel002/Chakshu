# PRD 15 — First-Party Telemetry: Event Tracking (T)

> **Status:** Authoritative. **Reverses** `project-overview.md` §3.2 ("analytics, telemetry SDKs — none") and narrows `code-standards.md` §11, by user directive, 20 Sep 2026.
> **What is still banned:** every *third-party* telemetry SDK and script — GA, Mixpanel, PostHog, Amplitude, Segment, Sentry, Hotjar, Clarity, W&B, MLflow. That ban is unchanged and is now load-bearing: an external tracker breaks the "no cloud or external APIs during evaluation" rule of SIH26227 and would be visible to a judge in the network tab.
> **What is now in scope:** our own event table in the Postgres we already run, our own ingest endpoint, our own admin panel. Zero new services.
> **Work-item IDs:** `T1`–`T9`.

---

## 1. Principles (T1)

1. **First-party or nothing.** One endpoint, `/api/v1/events`, same origin. No script tags from anywhere else.
2. **Telemetry must never be observable by the user.** It never blocks, never shows an error, never retries visibly, never slows a paint. If ingest is down, events are dropped after one retry and the app behaves identically.
3. **Collect behaviour, not identity.** We record *what was done*, plus the minimum context needed to answer "did anyone actually look at this". No keystrokes, no cursor paths, no screen recording, no form values, no imagery content, no question text longer than a truncated prefix.
4. **Everything collected is disclosed.** `/privacy` lists the event names and the fields verbatim (§8). If an event is not in that list, it may not be emitted.
5. **It must work at the finale, and must be honest there.** With the network disabled the app still tracks to itself; GeoIP resolves nothing for `127.0.0.1`. The admin panel shows `LOCAL` rather than inventing a city.

---

## 2. What you can and cannot know (T2)

Read this before designing anything else. Several things you asked for are not obtainable from a browser, and pretending otherwise produces an admin panel full of `unknown`.

| You want | Reality | What we ship |
|---|---|---|
| "Device name" | **Not obtainable.** A web page cannot read a device's hostname ("Rohan's MacBook Pro"). Browsers expose only the user agent, and since UA-reduction, desktop Chrome reports a frozen generic string | `ua_device` (`desktop`/`mobile`/`tablet`/`bot`), `ua_browser` + major version, `ua_os` + version, `screen` (e.g. `1920x1080`), `dpr`, `tz`. On Android, UA Client Hints can add a model; on iOS Safari you get almost nothing. Display as `DESKTOP · CHROME 141 · WINDOWS` — that is the honest maximum |
| "Location" | IP geolocation is **city-level at best**, wrong for VPNs/mobile carrier NAT, and unavailable for `127.0.0.1`/LAN IPs. Precise location requires a GPS permission prompt that most people deny | `geo_city`, `geo_region`, `geo_country` from a bundled offline GeoLite2 database (§7), plus `ip_hash` for "same visitor again?" — never the raw IP. Display accuracy as `~city`. GPS is **not** requested (see `ui-console.md`: no permission prompts) |
| "Who is looking" | Only what they tell you. An anonymous visitor is a browser, not a person | `GUEST-7F3A` labels, and the real name/email only after they sign in (S1) |
| "Which operations" | Fully obtainable — this is our own app emitting our own events | the taxonomy in §3, which is the actual value of this system |
| Repeat visits | Reliable while the cookie survives; incognito, cookie clearing, another device or another browser all look like a new visitor | Count `visitors` and `visits` separately (§9) and never claim "unique users" |

---

## 3. Event taxonomy (T3)

Names are `domain.object.verb`, lowercase, dot-separated, and are a **closed enum** in `data-contracts.md` §2. Adding an event means editing this file, the enum, and `/privacy` — in that order.

| Event | Emitted by | Payload (`p` JSONB) | Notes |
|---|---|---|---|
| `page.view` | router | `{path, title, referrer_host?, entry:boolean}` | once per navigation; `path` has query strings stripped |
| `landing.cta.click` | landing | `{cta, card?}` | W6 |
| `landing.section.view` | landing | `{section}` | ≥50% visible for ≥800 ms, once per section per visit |
| `scroll.depth` | landing | `{pct:25\|50\|75\|100}` | once each per visit |
| `landing.demo.interact` | landing | `{kind:"swipe"\|"hover"}` | once each per visit |
| `ui.nav.click` | shell | `{to, via:"tab"\|"rail"\|"shortcut"\|"deeplink"}` | |
| `ui.control.click` | `Button.tsx` | `{id, variant, slot, label}` | every button renders with a stable `data-track-id`; this is the *only* generic click event |
| `map.hover` | `map-fx.ts` | `{target_id?, count, dwell_ms}` | **aggregated**: one event on mouse-leave or after 5 s, never per pointer-move. `count` = polygons locked onto |
| `map.viewport` | `map-fx.ts` | `{z, center:[lat,lon] rounded to 4 dp}` | debounced 2 s after interaction ends, max 1 per 10 s |
| `map.swipe` | map | `{from_pct,to_pct}` | on release only |
| `op.start` | services | `{op, aoi_id?, upload_id?, params}` | `op` ∈ `change_detect`, `object_detect`, `landcover`, `search_semantic`, `search_similar`, `ask`, `upload`, `export`, `summary` |
| `op.result` | services | `{op, ok, duration_ms, counts, suppressed?, tier?}` | the workhorse metric |
| `op.error` | services | `{op, code, trace_id, duration_ms}` | code only — never a stack trace, never a message containing a path |
| `ask.question` | ask | `{question_len, tier, intents:[…], grounded:boolean}` | **length and shape, not the text.** Free-text questions can contain personal or sensitive content |
| `decision.set` | review | `{entity_type, entity_id, action:"confirm"\|"reject"\|"undo", had_note:boolean}` | |
| `upload.complete` | upload | `{mb, crs, gsd_m, gate:"pass"\|"fail"\|"warn", bands}` | no filename |
| `export.complete` | export | `{format, entities, with_provenance:boolean}` | |
| `auth.signup` / `auth.login` / `auth.logout` | auth | `{ok, method:"password"}` | never an email, never a failure reason beyond `ok:false` |
| `error.client` | error boundary | `{code, route, component}` | no stack, no message |
| `perf.mark` | shell | `{name:"lcp"\|"tti"\|"tiles", value_ms}` | once per visit per name |
| `offline.mode` | shell | `{offline:boolean}` | when `/health` reports offline — proves the demo ran offline |

**Payload limits:** `p` ≤ 2 KB serialised; strings truncated server-side at 256 chars; arrays at 20 items; depth 3. Anything over is dropped with a `422` and a `console.warn` in dev only.

---

## 4. Schema (T4)

```sql
-- ── Telemetry (first-party) ────────────────────────────────────────
CREATE TABLE event (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id  uuid NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  visit_id    uuid NOT NULL,               -- 30-min-gap cluster; computed at ingest (§9)
  user_id     uuid REFERENCES app_user(id) ON DELETE SET NULL,  -- denormalised for fast group-by
  name        text NOT NULL,               -- closed enum, validated in the API layer
  ts          timestamptz NOT NULL DEFAULT now(),
  client_ts   timestamptz,                 -- may be skewed; ts is authoritative
  path        text,                        -- route at emit time, query stripped
  p           jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer,                     -- for op.result / perf.mark
  ok          boolean                      -- for op.result / op.error
);
CREATE INDEX ON event (session_id, ts);
CREATE INDEX ON event (name, ts DESC);
CREATE INDEX ON event (visit_id);
CREATE INDEX event_p_gin ON event USING gin (p jsonb_path_ops);

CREATE TABLE visit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  started_at  timestamptz NOT NULL,
  ended_at    timestamptz,
  entry_path  text NOT NULL,
  exit_path   text,
  event_count integer NOT NULL DEFAULT 0,
  ops         jsonb NOT NULL DEFAULT '{}'::jsonb   -- {"change_detect":2,"ask":5}
);
CREATE INDEX ON visit (started_at DESC);
```

**Retention:** a nightly job (`scripts/prune_events.py`, called by the same scheduler as ingestion) deletes `event` rows older than **90 days** and `visit`/`session` rows older than **180**, and nulls `ua_raw` on sessions older than 30 days (parsed fields survive). Configure with `TELEMETRY_RETENTION_DAYS`. There is no analytics value in year-old hackathon events and there is real liability.

---

## 5. Ingest endpoint (T5)

```
POST /api/v1/events      → 204, no body, ever
```

```jsonc
// request — batched, 1..20 events
{
  "events": [
    { "name": "page.view", "client_ts": "2026-09-20T09:41:07.221Z",
      "path": "/", "p": { "entry": true } },
    { "name": "op.result", "client_ts": "…", "path": "/console",
      "p": { "op": "change_detect", "counts": { "changed": 12 } },
      "duration_ms": 8412, "ok": true }
  ]
}
```

Server behaviour, in order:
1. Resolve or create the session from `sid` (S1). **A missing/invalid cookie creates a guest session** — ingest must never 401, or we lose the first events of every new visitor.
2. Reject unknown `name` values (enum check) — count them in a metric, drop the event, still return `204`.
3. Truncate and validate `p` (§3 limits).
4. Bot filter (§7.4): if `ua_device = 'bot'` or the IP is in the configured ignore list, return `204` and **store nothing**.
5. Compute `visit_id` (§9) and insert in one `COPY`/`executemany` batch.
6. Return `204`. Errors inside ingest are logged server-side and still return `204` to the client.

Rate limit: 60 requests / minute / session, 400 events / minute / session. Over that → `429`, and the client **drops** the batch (no retry storm). This is what stops a hover-loop bug from filling the disk during a demo.

---

## 6. Client library (T6)

`frontend/src/lib/track.ts` — the only module allowed to emit. Nothing else constructs event objects.

```ts
track('op.result', { op: 'change_detect', ok: true, duration_ms: 8412 });
trackOnce('scroll.depth', { pct: 50 });      // deduped per visit via sessionStorage
trackAgg('map.hover', { target_id }, 5000);   // coalesced: {count, dwell_ms} flushed on leave/5s
```

Rules:
- **Queue and flush.** Buffer in memory; flush on any of: 5 events queued, 5 s elapsed, `visibilitychange → hidden`, `pagehide`, or a navigation. Flush with `navigator.sendBeacon('/api/v1/events', blob)`; if unavailable or it throws, fall back to `fetch(..., {keepalive:true})`.
- **Never await a flush** in product code. `track()` returns `void` synchronously.
- **One retry, then drop.** A failed batch is re-queued once; on a second failure it is discarded. No `localStorage` graveyard, no unbounded growth.
- **Session context is sent once**, not per event: on the first flush of a visit the client includes `ctx` (`screen`, `dpr`, `tz`, `lang`, `conn`), which the server writes to the `session` row.
- **Aggregation is mandatory for pointer-driven events.** `map.hover`, `map.viewport` and `scroll.depth` must use `trackAgg`/`trackOnce`. Emitting an event per `pointermove` is the single easiest way to destroy this system — it is a lint error (`no-restricted-syntax` on `track('map.hover'` outside `map-fx.ts`).
- **Dev/test:** when `NEXT_PUBLIC_TELEMETRY !== 'on'`, `track()` is a no-op that pushes to an in-memory array exposed as `window.__track` for tests. Playwright tests assert on that array, never on the network.
- **Ad blockers / strict browsers:** beacons to a same-origin first-party path are not usually blocked. If they are, nothing happens — that is acceptable and must not raise a visible error.
- **Do not** put the tracker in a `<Script>` tag, a third-party snippet, or a service worker.

---

## 7. Server-side enrichment (T7)

### 7.1 IP → location (offline only)
- Library: `geoip2` (Apache-2.0) reading a **bundled** `GeoLite2-City.mmdb`.
- Database licence: MaxMind GeoLite2 is free but under the **GeoLite2 End User License Agreement**, which requires attribution and forbids redistribution as open data. Therefore: `data/geoip/*.mmdb` is **gitignored**; `scripts/download_geoip.py` fetches it using `MAXMIND_ACCOUNT_ID` + `MAXMIND_LICENSE_KEY` from `.env`; `DEPENDENCIES.md` records name, version, source URL, licence, and the attribution string.
- Attribution, rendered on `/privacy` and in the admin panel footer: `This product includes GeoLite2 data created by MaxMind, available from https://www.maxmind.com.`
- **No network lookup, ever.** No ipinfo/ip-api/Google Geocoding calls. If the DB file is absent, `geo_*` stays `NULL` and the UI shows `UNKNOWN` — never a spinner, never an API call.
- Private/loopback ranges (`127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`, `::1`, `fc00::/7`) are tagged `geo_country = 'LOCAL'` and skipped. **This is what the finale demo will show** — plan the narration accordingly.

### 7.2 IP hashing
`ip_hash = hmac_sha256(SERVER_SECRET, client_ip)[:16]`, stored on the `session` row only. The raw IP is read from the request and **never written anywhere**, including logs — configure uvicorn's access log off or filter it. `SERVER_SECRET` comes from the environment; rotating it invalidates repeat-visitor detection, which is the intended behaviour for a "forget everyone" reset.

### 7.3 User-agent parsing
`ua_parser` (Apache-2.0) or `user-agents` (MIT) — pick one, record it. Store `ua_raw` (needed to re-parse later) plus the four parsed fields. Do not hand-roll a regex parser; UA strings are a swamp.

### 7.4 Bot and self-traffic filter
Drop events when: UA matches a bot list (`bot|crawl|spider|headless|curl|python-requests|lighthouse`), or `X-Purpose: preview`, or the IP is in `TELEMETRY_IGNORE_IPS` (put your own dev machine and the college Wi-Fi NAT in there before sharing the link, or your own 200 reloads become your "traffic"). The admin panel shows the dropped count — `N FILTERED` — because silently vanishing events look like a bug.

---

## 8. Privacy notice (T8)

`/privacy` is a real route, styled as a document page (max-width 720 px, `--t-body`), linked from the landing footer, the console account menu, and the auth dialog. Verbatim content:

```
WHAT WE RECORD, AND WHY

Chakshu runs its own analytics. There are no third-party trackers, no advertising
scripts, and no data leaves the machine this site runs on.

When you use this site we store:
  · a random session identifier in a cookie (sid), so we can tell one visit from another
  · the pages you open and the buttons you use, with a timestamp
  · which operations you run — change detection, object detection, search, questions —
    how long they took, and whether they succeeded
  · your browser, operating system, device type and screen size, from the user agent
  · an approximate city derived from your IP address using an offline database
  · a one-way hash of your IP address, so we can recognise a returning visitor
    without storing the address itself
  · if you create an account: your email address and a hashed password

We do not record: keystrokes, mouse paths, screen recordings, form contents, the text
of your questions (only their length and shape), uploaded image content, or filenames.

Retention: events 90 days, sessions and visits 180 days, raw user-agent strings 30 days.
Sharing: none. We do not sell, rent, or transmit this data to anyone.
Your control: clearing the cookie starts a fresh anonymous session; asking us at
<team email> deletes everything we hold for that session.

This product includes GeoLite2 data created by MaxMind, available from
https://www.maxmind.com.
```

Footer line on every page: `NO THIRD-PARTY TRACKERS · WHAT WE RECORD` (link). **Do not** add a cookie-consent modal: a blocking banner for first-party, non-advertising, disclosed analytics is friction with no legal benefit at a hackathon, and the notice is one click away. If the project is ever deployed publicly outside a competition, revisit this with actual counsel — that is a real caveat, not a shrug.

---

## 9. Derived metrics and their exact definitions (T9)

Ambiguity here is what makes analytics panels lie. Definitions are normative.

| Metric | Definition |
|---|---|
| **Visitor** | one `session` row (one browser + cookie). Not a person |
| **Visit** | a maximal run of events from one session with gaps < **30 min**. `visit_id` is assigned at ingest: reuse the session's open `visit` if its last event is < 30 min old, else open a new one and close the previous (`ended_at`, `exit_path`, `ops`) |
| **Active now** | sessions with an event in the last 5 min |
| **Operation count** | `op.start` events, grouped by `p.op` |
| **Operation success rate** | `op.result` with `ok=true` ÷ all `op.result`, per `op` |
| **Completion** | `op.start` followed by an `op.result` for the same `op` within the same visit |
| **Dwell** | `visit.ended_at - started_at`, capped at 30 min per visit |
| **Drop-off** | visits whose last event is `page.view` on `/` and nothing else |
| **LCP** | `perf.mark{name:"lcp"}` p75 per day |
| **Offline runs** | `offline.mode{offline:true}` events — evidence for the submission that the demo ran with the network down |

Never present `visitors` as `users`, and never compute a mean without a count next to it. Every number in the admin panel shows `n` beside it.

---

## 10. Acceptance criteria

- [ ] No request to any non-first-party origin from any page (verified with the network offline and with a request log)
- [ ] `track()` is synchronous, never throws, and a dead ingest endpoint changes nothing user-visible (test: point the beacon at a 500 and assert the UI is unaffected)
- [ ] Events are batched: a 60 s console session with 40 interactions produces ≤ 12 requests
- [ ] `map.hover` produces at most 1 event per 5 s per pointer session; a `pointermove` handler emits nothing (lint + test)
- [ ] Every event name emitted exists in the §3 table and the `data-contracts.md` enum; unknown names are rejected server-side and counted
- [ ] Ingest returns `204` for an unknown cookie and creates a guest session
- [ ] Rate limit: the 61st request in a minute returns `429` and the client drops the batch without retrying
- [ ] Raw IP and `token_hash` appear in no response, no log line, and no table other than `session.ip_hash`
- [ ] Loopback/private IPs resolve to `LOCAL`, not a fabricated city
- [ ] Missing GeoLite2 DB degrades to `geo_* = NULL` with no network call and no error surfaced
- [ ] `/privacy` renders the §8 copy verbatim, including the MaxMind attribution
- [ ] Retention job deletes rows past the configured ages (test with a clock offset)
- [ ] `TELEMETRY_IGNORE_IPS` filters your own traffic and the admin panel reports the filtered count
- [ ] Metrics match the §9 definitions, asserted by golden tests on a seeded fixture set
