CREATE TABLE mobile_client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(254) NOT NULL UNIQUE,
  full_name varchar(120) NOT NULL,
  phone varchar(16) NOT NULL,
  email_verified_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE mobile_client_challenges (
  id uuid PRIMARY KEY,
  email varchar(254) NOT NULL UNIQUE,
  full_name varchar(120),
  phone varchar(16),
  code_digest varchar(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  delivered boolean NOT NULL DEFAULT false,
  consumed boolean NOT NULL DEFAULT false
);
--> statement-breakpoint
CREATE TABLE mobile_client_sessions (
  token_digest varchar(64) PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES mobile_client_accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mobile_client_session_client_idx ON mobile_client_sessions(client_id);
--> statement-breakpoint
CREATE TABLE mobile_client_auth_limits (
  key varchar(64) PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL,
  last_at timestamptz NOT NULL
);
