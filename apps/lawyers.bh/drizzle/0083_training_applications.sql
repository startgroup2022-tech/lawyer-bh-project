CREATE TABLE IF NOT EXISTS training_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('law','other')),
  email text NOT NULL,
  data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','review','interview','accepted','rejected')),
  notes text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_admin_id uuid,
  archived_at timestamptz,
  archived_by_admin_id uuid
);
CREATE INDEX IF NOT EXISTS training_applications_filter_idx ON training_applications(type,status,created_at DESC);
CREATE INDEX IF NOT EXISTS training_applications_archive_idx ON training_applications(archived_at,created_at DESC);
CREATE TABLE IF NOT EXISTS training_attachments (
  application_id uuid NOT NULL REFERENCES training_applications(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('cv','university_letter')),
  name text NOT NULL,
  bytes bytea NOT NULL CHECK (octet_length(bytes) BETWEEN 12 AND 5242880),
  PRIMARY KEY (application_id,kind)
);
CREATE TABLE IF NOT EXISTS training_uploads (
  token_hash text PRIMARY KEY,
  data jsonb NOT NULL,
  manifest jsonb NOT NULL,
  cv_bytes bytea NOT NULL DEFAULT '\x' CHECK (octet_length(cv_bytes) <= 5242880),
  letter_bytes bytea NOT NULL DEFAULT '\x' CHECK (octet_length(letter_bytes) <= 5242880),
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '30 minutes'),
  application_id uuid REFERENCES training_applications(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS training_uploads_expiry_idx ON training_uploads(expires_at);
CREATE TABLE IF NOT EXISTS training_rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1
);
