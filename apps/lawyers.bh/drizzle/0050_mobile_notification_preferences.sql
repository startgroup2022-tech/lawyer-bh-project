CREATE TABLE mobile_notification_device_preferences (
  device_key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  requests boolean NOT NULL DEFAULT true,
  communications boolean NOT NULL DEFAULT true,
  advertising boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE mobile_notification_token_bindings (
  token_digest text PRIMARY KEY,
  device_key text NOT NULL REFERENCES mobile_notification_device_preferences(device_key) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX mobile_notification_token_bindings_device_idx ON mobile_notification_token_bindings(device_key);
