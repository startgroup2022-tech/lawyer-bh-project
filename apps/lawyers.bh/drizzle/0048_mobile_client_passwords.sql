ALTER TABLE mobile_client_accounts ADD COLUMN password_hash varchar(200);
--> statement-breakpoint
ALTER TABLE mobile_client_challenges ADD COLUMN password_hash varchar(200);
ALTER TABLE mobile_client_challenges ADD COLUMN purpose varchar(16) NOT NULL DEFAULT 'legacy';
