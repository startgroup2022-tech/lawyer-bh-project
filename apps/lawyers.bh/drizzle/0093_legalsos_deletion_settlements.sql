CREATE TABLE legalsos_deletion_settlements (
  lifecycle_id uuid NOT NULL REFERENCES legalsos_account_lifecycle(id),
  request_id uuid NOT NULL REFERENCES bahrain_emergency_requests(id),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','settled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  settled_by text,
  PRIMARY KEY (lifecycle_id,request_id),
  CHECK ((state='pending' AND settled_at IS NULL AND settled_by IS NULL)
    OR (state='settled' AND settled_at IS NOT NULL AND settled_by IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX legalsos_deletion_settlements_pending_idx ON legalsos_deletion_settlements(created_at)
  WHERE state='pending';
--> statement-breakpoint
CREATE TABLE legalsos_deletion_notifications (
  lifecycle_id uuid NOT NULL REFERENCES legalsos_account_lifecycle(id),
  request_id uuid NOT NULL REFERENCES bahrain_emergency_requests(id),
  recipient_role text NOT NULL CHECK (recipient_role IN ('client','lawyer')),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  PRIMARY KEY(lifecycle_id,request_id,recipient_role)
);
--> statement-breakpoint
ALTER TABLE legalsos_deletion_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalsos_deletion_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON legalsos_deletion_settlements,legalsos_deletion_notifications FROM PUBLIC;
