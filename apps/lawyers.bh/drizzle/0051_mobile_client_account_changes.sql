ALTER TABLE mobile_client_challenges
  ADD COLUMN client_id uuid REFERENCES mobile_client_accounts(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE mobile_client_challenges
  DROP CONSTRAINT mobile_client_challenges_email_key;
--> statement-breakpoint
CREATE UNIQUE INDEX mobile_client_challenges_public_email_unique
  ON mobile_client_challenges(email)
  WHERE purpose IN ('register', 'reset');
--> statement-breakpoint
CREATE INDEX mobile_client_challenges_account_purpose_idx
  ON mobile_client_challenges(client_id, purpose, consumed, expires_at);
