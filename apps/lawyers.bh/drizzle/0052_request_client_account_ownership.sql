ALTER TABLE bahrain_emergency_requests
  ADD COLUMN client_account_id uuid
  REFERENCES mobile_client_accounts(id)
  ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX bahrain_emergency_requests_client_account_idx
  ON bahrain_emergency_requests(client_account_id, created_at DESC);
--> statement-breakpoint
ALTER TABLE bahrain_booking_requests
  ADD COLUMN client_account_id uuid
  REFERENCES mobile_client_accounts(id)
  ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX bahrain_booking_requests_client_account_idx
  ON bahrain_booking_requests(client_account_id, created_at DESC);
