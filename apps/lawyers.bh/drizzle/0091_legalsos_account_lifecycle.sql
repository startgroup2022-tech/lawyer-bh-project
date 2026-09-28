-- App-only lifecycle: intentionally no cascading FK to shared website identity.
CREATE TABLE legalsos_account_lifecycle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_role text NOT NULL CHECK (subject_role IN ('client', 'lawyer')),
  subject_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'pending_deletion'
    CHECK (state IN ('pending_deletion', 'purging', 'purged')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  purge_after timestamptz NOT NULL DEFAULT (now() + interval '720 hours'),
  UNIQUE (subject_role, subject_id),
  CHECK (purge_after = requested_at + interval '720 hours')
);
--> statement-breakpoint
CREATE INDEX legalsos_account_lifecycle_due_idx
  ON legalsos_account_lifecycle (purge_after, id) WHERE state <> 'purged';
--> statement-breakpoint
CREATE FUNCTION legalsos_preserve_deletion_identity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.subject_role IS DISTINCT FROM OLD.subject_role
    OR NEW.subject_id IS DISTINCT FROM OLD.subject_id
    OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
    OR NEW.purge_after IS DISTINCT FROM OLD.purge_after THEN
    RAISE EXCEPTION 'immutable_deletion_identity';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER legalsos_preserve_deletion_identity
BEFORE UPDATE ON legalsos_account_lifecycle
FOR EACH ROW EXECUTE FUNCTION legalsos_preserve_deletion_identity();
--> statement-breakpoint
ALTER TABLE legalsos_account_lifecycle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON legalsos_account_lifecycle FROM PUBLIC;
