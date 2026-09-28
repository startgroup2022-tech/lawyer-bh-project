-- Private app-only proof store; issuance is allowed only after fresh reauthentication.
CREATE TABLE legalsos_deletion_proofs (
  token_digest varchar(64) PRIMARY KEY CHECK (token_digest ~ '^[0-9a-f]{64}$'),
  subject_role text NOT NULL CHECK (subject_role IN ('client', 'lawyer')),
  subject_id uuid NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  consumed_at timestamptz,
  CHECK (expires_at = issued_at + interval '5 minutes')
);
--> statement-breakpoint
CREATE INDEX legalsos_deletion_proofs_expiry_idx ON legalsos_deletion_proofs (expires_at);
--> statement-breakpoint
ALTER TABLE legalsos_deletion_proofs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON legalsos_deletion_proofs FROM PUBLIC;
