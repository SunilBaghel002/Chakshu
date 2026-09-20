-- 004_sessions.sql
-- Guest sessions: PRD 14 §5 (S5), Task 8.10
-- Depends on: 001_extensions (for citext)

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
  token_hash    bytea NOT NULL UNIQUE,
  user_id       uuid REFERENCES app_user(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'guest'
                CHECK (role IN ('guest','analyst','admin')),
  label         text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  admin_since   timestamptz,
  revoked_at    timestamptz,
  first_path    text NOT NULL DEFAULT '/',
  referrer_host text,
  ua_raw        text,
  ua_device     text,
  ua_browser    text,
  ua_os         text,
  screen        text,
  ip_hash       bytea,
  geo_city      text,
  geo_region    text,
  geo_country   text
);
CREATE INDEX IF NOT EXISTS idx_session_last_seen ON session (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_user ON session (user_id) WHERE user_id IS NOT NULL;

-- ── Visit tracking ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visit (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  page_count    integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_visit_session ON visit (session_id);

-- ── Telemetry events (PRD 15 §4) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS event (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id  uuid NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  visit_id    uuid,
  user_id     uuid REFERENCES app_user(id) ON DELETE SET NULL,
  name        text NOT NULL,
  ts          timestamptz NOT NULL DEFAULT now(),
  client_ts   timestamptz,
  path        text,
  p           jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer
);
CREATE INDEX IF NOT EXISTS idx_event_session ON event (session_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_event_name ON event (name, ts DESC);

-- ── Link decisions to sessions ────────────────────────────────────
-- These columns may already exist; ALTER TABLE ADD COLUMN IF NOT EXISTS
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
