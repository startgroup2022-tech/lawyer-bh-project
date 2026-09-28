CREATE TABLE legalsos_purge_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz,
  state text NOT NULL DEFAULT 'running' CHECK(state IN ('running','completed','failed')),
  processed integer NOT NULL DEFAULT 0 CHECK(processed>=0),
  failed integer NOT NULL DEFAULT 0 CHECK(failed>=0)
);
--> statement-breakpoint
CREATE INDEX legalsos_purge_runs_started_idx ON legalsos_purge_runs(started_at DESC);
--> statement-breakpoint
CREATE TABLE legalsos_deletion_alerts (
  lifecycle_id uuid NOT NULL REFERENCES legalsos_account_lifecycle(id),
  kind text NOT NULL CHECK(kind IN ('seven_days','one_day','overdue')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(lifecycle_id,kind)
);
--> statement-breakpoint
ALTER TABLE legalsos_purge_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalsos_deletion_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON legalsos_purge_runs,legalsos_deletion_alerts FROM PUBLIC;
