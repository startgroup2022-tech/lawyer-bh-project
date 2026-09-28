CREATE TABLE IF NOT EXISTS direct_upload_sessions (
  id uuid PRIMARY KEY,
  browser_hash text NOT NULL,
  workflow text NOT NULL CHECK (workflow IN ('join','complete','import')),
  principal text NOT NULL,
  files jsonb NOT NULL CHECK (jsonb_typeof(files) = 'array'),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes'
);
CREATE INDEX IF NOT EXISTS direct_upload_sessions_expiry ON direct_upload_sessions(expires_at);
CREATE TABLE IF NOT EXISTS direct_upload_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS private_provider_documents (
  id uuid PRIMARY KEY,
  table_prefix text NOT NULL,
  pathname text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  retained boolean NOT NULL DEFAULT false
);
