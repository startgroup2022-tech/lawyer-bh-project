CREATE TABLE IF NOT EXISTS careers_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  content jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed','archived')),
  closes_at timestamptz NOT NULL,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  updated_by_admin_id uuid NOT NULL
);
CREATE INDEX IF NOT EXISTS careers_jobs_public_idx ON careers_jobs(status, closes_at);
CREATE TABLE IF NOT EXISTS careers_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES careers_jobs(id) ON DELETE RESTRICT,
  email text NOT NULL,
  data jsonb NOT NULL,
  cv bytea NOT NULL CHECK (octet_length(cv) BETWEEN 12 AND 5242880),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','review','interview','accepted','rejected')),
  notes text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_admin_id uuid,
  UNIQUE(job_id, email)
);
CREATE INDEX IF NOT EXISTS careers_applications_filter_idx ON careers_applications(job_id, status, created_at DESC);
CREATE TABLE IF NOT EXISTS careers_uploads (
  token_hash text PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES careers_jobs(id) ON DELETE RESTRICT,
  data jsonb NOT NULL,
  expected_size integer NOT NULL CHECK (expected_size BETWEEN 12 AND 5242880),
  bytes bytea NOT NULL DEFAULT '\x',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  application_id uuid REFERENCES careers_applications(id) ON DELETE CASCADE,
  CHECK (octet_length(bytes) <= expected_size)
);
CREATE INDEX IF NOT EXISTS careers_uploads_expiry_idx ON careers_uploads(expires_at);
CREATE TABLE IF NOT EXISTS careers_rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1
);
