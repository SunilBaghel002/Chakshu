# PRD 14 — Identity: Anonymous-First Sessions and Optional Login (S)

> **Status:** Authoritative. **Reverses** `project-overview.md` §3.2 ("User accounts, roles, permissions — excluded") and `ai-workflow-rules.md` Rule 4 ("Do not add authentication"), by user directive, 20 Sep 2026. Those files carry a dated note pointing here.
> **Work-item IDs:** `S1`–`S7`.
> **Decision taken:** *anonymous first, login optional.* A judge must reach a populated console with zero clicks. Accounts exist so work can be saved and so the admin panel can attribute actions to a person — not as a gate.

---

## 1. Model (S1)

Two kinds of principal, one mechanism:

| Principal | Created | Identity | Label shown in UI | Can |
|---|---|---|---|---|
| **Guest session** | automatically, on the first API request from a browser with no `sid` cookie | `session.id` only | `GUEST-7F3A` (first 4 hex of the session fingerprint) | use every console feature; emit telemetry; save nothing that survives cookie loss |
| **User** | explicitly, via `Sign in` / `Create account` | `app_user.id` + the session it owns | display name, else local-part of email | everything a guest can, plus persisted decisions across devices, and (if `admin`) `/admin` |

Rules:
- There is **no** third mechanism. No API keys, no OAuth, no magic links, no SSO.
- A guest session that later logs in is **the same session row**, with `user_id` filled in. Telemetry captured before login stays attributed to that session — this is what makes "who looked at the site before signing up" answerable.
- Guest work (confirm/reject decisions) is written to `decision` with `session_id` and a null `user_id`, and is re-attributed on login. Nothing is discarded.
- `analyst_id` — the hardcoded value used until now — becomes `session.id`. Existing code that reads a constant must read the session instead.

---

## 2. Cookies and same-origin rule (S2)

**One cookie:**

| Attribute | Value |
|---|---|
| name | `sid` |
| value | 32 random bytes, base64url (43 chars) — the *token*; only its SHA-256 is stored |
| `HttpOnly` | yes — telemetry and app JS never read it |
| `Secure` | yes when `ENV=prod`; no in dev over http://localhost |
| `SameSite` | `Lax` |
| `Path` | `/` |
| `Max-Age` | guest 30 days sliding · authenticated 7 days sliding · re-issued on every response that is older than 1 h |

**The same-origin requirement is architectural, not stylistic.** Vite (3000) and FastAPI (8000) are different origins; a `Lax` cookie will not ride cross-origin `fetch` calls, and switching to `SameSite=None` + CORS credentials is a security downgrade that also breaks `sendBeacon` in Safari.

**On Vite the rewrite is the dev-server proxy, not `next.config.ts`** (`code-standards.md` §1.1). It already exists at `frontend/vite.config.ts` and needs no change beyond confirming the path prefix:

```js
// frontend/vite.config.ts — dev
server: {
  port: 3000,
  proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } },
}
```

For production, the reverse proxy in front of the built `frontend/dist/` plays the same role; the browser still sees one origin. `lib/api.ts` uses relative URLs (`/api/v1/…`) and `credentials: 'same-origin'`. **No absolute backend URL may appear in client code** — this also keeps the preview/deploy host working.

**Security consequence, restated because it is easy to miss:** Vite has no server runtime, so **there are no server-side role checks.** `auth.md` S4/S6 and every gate in `admin-panel.md` must be enforced in FastAPI. A client-side role test is not a gate.

---

## 3. Password handling (S3)

| Item | Value |
|---|---|
| Hash | **argon2id** via `argon2-cffi` (MIT). Params: `time_cost=3`, `memory_cost=65536` (64 MiB), `parallelism=1`, `hash_len=32`, `salt_len=16` |
| Fallback if the dependency gate rejects it | `hashlib.scrypt(n=2**15, r=8, p=1)` from the stdlib — zero new dependencies. Pick one and record it in `DEPENDENCIES.md`; do not support both |
| Storage | `app_user.password_hash` (the full PHC/encoded string, never a bare digest) |
| Comparison | the library's `verify`, which is constant-time. Never `==` on a hash |
| Rehash | if `argon2.check_needs_rehash(...)`, rehash on successful login |
| Policy | min 10 characters; must not equal the email or the display name; **no complexity theatre** (no forced symbols/case) |
| Reset | **No email.** There is no SMTP at a finale with the network off. Recovery is `python scripts/make_admin.py reset <email>` which prints a one-time code to the terminal; the user signs in with it once and it is consumed |
| Enumeration | identical response for unknown email and wrong password: `EMAIL OR PASSWORD IS INCORRECT` · code `AUTH_FAILED` · 401 |
| Timing | run a dummy `verify` on the unknown-email path so response times do not leak account existence |
| Rate limit | 5 failed attempts per (IP, email) per 5 minutes → 429 `RATE_LIMITED` with `Retry-After`. In-process token bucket in a module-level dict; **no Redis** (banned by `code-standards.md` §11). Documented limitation: correct for a single uvicorn worker, which is what we ship |

---

## 4. Roles and authorisation (S4)

Three values, in `app_user.role` and derivable for guests:

| Role | Grants |
|---|---|
| `guest` | console, telemetry, own decisions |
| `analyst` | + persisted identity, + export history, + see own audit entries |
| `admin` | + all of `/api/v1/admin/*` and the `/admin` UI |

- Enforcement is a FastAPI dependency, never a UI check: `user = Depends(require_role("admin"))`. The UI hiding a link is *not* authorisation.
- Admin sessions carry `admin_since`; admin routes reject a session whose `admin_since` is older than **12 h** and require re-login. Idle timeout for admin: 60 min.
- **Bootstrap:** no admin exists on a fresh database. `python scripts/make_admin.py create <email>` creates the user with a random password printed once, or promotes an existing user. The first session to hit `/admin` without an admin user sees `NO ADMIN CONFIGURED · RUN scripts/make_admin.py`, not a 500.
- Session fixation: on login, **rotate** the token (new random value, same row, new hash) before setting the cookie.

---

## 5. Database (S5)

Append to `architecture.md` §4's DDL. Same conventions: `uuid` PKs, `timestamptz`, no ORM-only fields.

```sql
-- ── Identity ───────────────────────────────────────────────────────
CREATE TABLE app_user (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NOT NULL UNIQUE,          -- requires: CREATE EXTENSION citext;
  password_hash text NOT NULL,
  display_name  text,
  role          text NOT NULL DEFAULT 'analyst'
                CHECK (role IN ('analyst','admin')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE session (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash    bytea NOT NULL UNIQUE,           -- sha256(sid token); the token is never stored
  user_id       uuid REFERENCES app_user(id) ON DELETE CASCADE,   -- null = guest
  role          text NOT NULL DEFAULT 'guest'
                CHECK (role IN ('guest','analyst','admin')),
  label         text NOT NULL,                   -- 'GUEST-7F3A' or display name, denormalised for the admin panel
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  admin_since   timestamptz,                     -- null unless role='admin'
  revoked_at    timestamptz,
  -- denormalised context, written by the session middleware, read by the admin panel
  first_path    text NOT NULL DEFAULT '/',
  referrer_host text,                            -- host only, never a full URL with query strings
  ua_raw        text,
  ua_device     text,                            -- 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'
  ua_browser    text,
  ua_os         text,
  screen        text,                            -- '1920x1080'
  ip_hash       bytea,                           -- hmac_sha256(ip, SERVER_SECRET); raw IP is never stored
  geo_city      text,
  geo_region    text,
  geo_country   text
);
CREATE INDEX ON session (last_seen_at DESC);
CREATE INDEX ON session (user_id) WHERE user_id IS NOT NULL;

-- decision/audit gain a session_id so guest work is attributable and re-linkable
ALTER TABLE decision ADD COLUMN session_id uuid REFERENCES session(id);
ALTER TABLE decision ADD COLUMN user_id   uuid REFERENCES app_user(id);
```

`CREATE EXTENSION citext;` is a new extension — record it in `architecture.md` §4's header comment. Sessions are **not** telemetry: the `event` table lives in `tracking.md` §4 and references `session.id`.

---

## 6. Endpoints (S6)

All under `/api/v1`, same envelope and error conventions as `data-contracts.md`.

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| `GET` | `/session` | cookie or none | — | `Session` (below). Creates the guest session as a side effect if absent |
| `POST` | `/auth/signup` | none | `{email, password, display_name?}` | `201` + `Session` (now authenticated, token rotated) |
| `POST` | `/auth/login` | none | `{email, password}` | `200` + `Session` |
| `POST` | `/auth/logout` | cookie | — | `204`, row `revoked_at` set, cookie cleared with `Max-Age=0` |
| `PATCH` | `/session/me` | authenticated | `{display_name}` | `Session` |
| `GET` | `/admin/users` | `admin` | — | `{items:[UserSummary], total}` |
| `PATCH` | `/admin/users/{id}` | `admin` | `{role}` | `UserSummary` |
| `POST` | `/admin/users/{id}/reset` | `admin` | — | `{one_time_code}` — shown once, never stored in plain |
| `GET` | `/admin/sessions` | `admin` | — | see `admin-panel.md` |

```jsonc
// Session — the object the frontend receives. Never contains token_hash or ip_hash.
{
  "id": "9f2c1a44-…",
  "public_label": "GUEST-7F3A",
  "kind": "guest",                    // "guest" | "user"
  "role": "guest",                    // "guest" | "analyst" | "admin"
  "user": null,                       // {id, email, display_name, role} when signed in
  "created_at": "2026-09-20T09:41:07Z",
  "last_seen_at": "2026-09-20T09:58:12Z",
  "counts": { "events": 42, "decisions": 3, "uploads": 1 }
}
```

Error codes to add to `data-contracts.md` §8: `AUTH_FAILED` (401), `AUTH_REQUIRED` (401), `ROLE_REQUIRED` (403), `SESSION_EXPIRED` (401), `RATE_LIMITED` (429), `EMAIL_TAKEN` (409), `WEAK_PASSWORD` (422), `NO_ADMIN_CONFIGURED` (503).

---

## 7. UI surface (S7)

Placement per `ui-console.md`; styling per `ui-controls.md`.

- **Console:** the session chip is SLOT-01.7. Click → `menu` (K4) with: `SIGNED IN AS GUEST-7F3A` header row, `SIGN IN` secondary, `CREATE ACCOUNT` ghost, `PRIVACY NOTICE` ghost, `ADMIN PANEL` (only when `role=admin`), divider, `WHAT WE TRACK` → `/privacy`. **No `SIGN OUT` for guests** — there is nothing to sign out of; show `CLEAR SESSION DATA` instead, which revokes the row and deletes local state.
- **Auth dialog:** a `dialog` (K9), 400 px wide, opened from the menu — *not* a route. Fields: email, password, `CREATE ACCOUNT` / `SIGN IN` primary (44 px), `NOT NOW` ghost left. One dialog, two modes, toggled by a text link; the title changes (`SIGN IN` / `CREATE ACCOUNT`), the layout does not.
- **Route `/signin`** exists as a standalone page with the same dialog inline, for deep links and for the landing nav's `SIGN IN`. It renders the identical component.
- **No account wall anywhere.** Nothing in the console may require login except `/admin`. If a feature would benefit from persistence, it saves to the session and offers `SIGN IN TO KEEP THIS` as a *toast*, not a blocker.

---

## 8. Explicitly not built

| Excluded | Why |
|---|---|
| OAuth / Google sign-in | Needs internet + client IDs; violates the "network disabled" demo rule |
| Email verification, password reset email, SMTP | No mail at a finale; CLI recovery instead |
| 2FA / TOTP | Out of time scope; would need a recovery story we cannot support |
| Multi-tenancy, organisations, per-AOI permissions | Single-team demo; roles stop at `admin` |
| JWT | Server-side sessions are revocable and we already have Postgres; a JWT adds a secret-rotation problem for no gain |
| NextAuth / Auth.js / Clerk / Supabase Auth | Puts auth logic in Node, contradicting "FastAPI is the only backend", and adds a heavy dependency |
| Session recording, replay, keystroke capture | Not telemetry we are willing to defend to a judge |

---

## 9. Acceptance criteria

- [ ] First request with no cookie returns a `Session` with `kind:"guest"` and sets `sid` with every flag in §2
- [ ] Browser dev tools show exactly one origin for all `/api/*` calls (rewrite works in dev and prod)
- [ ] Login rotates the token; the pre-login session's events remain attributed to the same `session.id`
- [ ] Guest decisions are re-attributed to `user_id` on login, with no duplicates
- [ ] Unknown email and wrong password return identical bodies **and** near-identical timings (test asserts both)
- [ ] 6th failed login in 5 minutes returns 429 with `Retry-After`
- [ ] `token_hash` and `ip_hash` never appear in any API response (golden test on `/session` and `/admin/sessions`)
- [ ] `/api/v1/admin/*` returns 403 `ROLE_REQUIRED` for `analyst` and 401 `AUTH_REQUIRED` for guests
- [ ] Admin session rejected after 12 h (`admin_since`) and after 60 min idle
- [ ] `scripts/make_admin.py create` works on an empty database; `/admin` shows `NO ADMIN CONFIGURED` before it is run
- [ ] Logout revokes the row and clears the cookie; a replayed cookie is rejected
- [ ] Every excluded item in §8 is absent from the codebase (grep for `next-auth`, `jwt`, `oauth`)
