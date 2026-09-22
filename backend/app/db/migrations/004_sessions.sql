-- 004_sessions.sql
-- Guest sessions & Telemetry: PRD 14 §5 (S5) & PRD 15 §4 (T4)
-- Enables anonymous-first sessions, visit clustering, and event tracking

CREATE EXTENSION IF NOT EXISTS citext;

-- ── Identity ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_user (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name  text,
  role          text NOT NULL DEFAULT 'analyst'
                CHECK (role IN ('analyst','admin')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

-- ── Sessions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash    bytea NOT NULL UNIQUE,           -- sha256(sid token); the token is never stored
  user_id       uuid REFERENCES app_user(id) ON DELETE CASCADE,   -- null = guest
  role          text NOT NULL DEFAULT 'guest'
                CHECK (role IN ('guest','analyst','admin')),
  label         text NOT NULL,                   -- 'GUEST-7F3A' or display name, denormalised for admin
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  admin_since   timestamptz,                     -- null unless role='admin'
  revoked_at    timestamptz,
  first_path    text NOT NULL DEFAULT '/',
  referrer_host text,                            -- host only, never full url with query strings
  ua_raw        text,
  ua_device     text,                            -- 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'
  ua_browser    text,
  ua_os         text,
  screen        text,                            -- '1920x1080'
  ip_hash       bytea,                           -- hmac_sha256(SERVER_SECRET, ip)[:16]; raw IP never stored
  geo_city      text,
  geo_region    text,
  geo_country   text
);
CREATE INDEX IF NOT EXISTS idx_session_last_seen ON session (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_user ON session (user_id) WHERE user_id IS NOT NULL;

-- ── Visit tracking ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  started_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz,
  entry_path  text NOT NULL,
  exit_path   text,
  event_count integer NOT NULL DEFAULT 0,
  ops         jsonb NOT NULL DEFAULT '{}'::jsonb   -- {"change_detect":2,"ask":5}
);
CREATE INDEX IF NOT EXISTS idx_visit_session ON visit (session_id);
CREATE INDEX IF NOT EXISTS idx_visit_started ON visit (started_at DESC);

-- ── Telemetry events (PRD 15 §4) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS event (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id  uuid NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  visit_id    uuid NOT NULL,               -- 30-min-gap cluster; computed at ingest
  user_id     uuid REFERENCES app_user(id) ON DELETE SET NULL,  -- denormalised for fast group-by
  name        text NOT NULL,               -- closed enum, validated in the API layer
  ts          timestamptz NOT NULL DEFAULT now(),
  client_ts   timestamptz,                 -- may be skewed; ts is authoritative
  path        text,                        -- route at emit time, query stripped
  p           jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer,                     -- for op.result / perf.mark
  ok          boolean                      -- for op.result / op.error
);
CREATE INDEX IF NOT EXISTS idx_event_session ON event (session_id, ts);
CREATE INDEX IF NOT EXISTS idx_event_name ON event (name, ts DESC);
CREATE INDEX IF NOT EXISTS idx_event_visit ON event (visit_id);
CREATE INDEX IF NOT EXISTS event_p_gin ON event USING gin (p jsonb_path_ops);

-- ── Link decisions to sessions ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'decision' AND column_name = 'session_id') THEN
    ALTER TABLE decision ADD COLUMN session_id uuid REFERENCES session(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'decision' AND column_name = 'user_id') THEN
    ALTER TABLE decision ADD COLUMN user_id uuid REFERENCES app_user(id);
  END IF;
END $$;
