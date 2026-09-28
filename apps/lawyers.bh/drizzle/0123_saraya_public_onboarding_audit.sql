BEGIN;

SET LOCAL lock_timeout = '5s';

CREATE TABLE "saraya_auth_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "challenge_id" uuid,
  "user_id" uuid,
  "event" varchar(64) NOT NULL,
  "outcome" varchar(24) NOT NULL,
  "reason" varchar(32),
  "ip_address" text,
  "user_agent" varchar(256),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz(3) DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_auth_audit_logs_challenge_fk"
    FOREIGN KEY ("challenge_id") REFERENCES "saraya_auth_challenges"("id") ON DELETE SET NULL,
  CONSTRAINT "saraya_auth_audit_logs_user_fk"
    FOREIGN KEY ("user_id") REFERENCES "saraya_users"("id") ON DELETE SET NULL,
  CONSTRAINT "saraya_auth_audit_logs_event_check"
    CHECK ("event" IN ('challenge.requested', 'challenge.delivery.sent', 'challenge.delivery.failed', 'verify.succeeded', 'verify.failed')),
  CONSTRAINT "saraya_auth_audit_logs_outcome_check"
    CHECK ("outcome" IN ('accepted', 'succeeded', 'failed')),
  CONSTRAINT "saraya_auth_audit_logs_reason_check"
    CHECK ("reason" IS NULL OR "reason" IN ('invalid', 'expired', 'consumed', 'disabled', 'rate_limited', 'delivery_failed', 'validation_failed', 'internal_error')),
  CONSTRAINT "saraya_auth_audit_logs_metadata_check"
    CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE INDEX "saraya_auth_audit_logs_challenge_created_idx"
  ON "saraya_auth_audit_logs" ("challenge_id", "created_at" DESC);
CREATE INDEX "saraya_auth_audit_logs_user_created_idx"
  ON "saraya_auth_audit_logs" ("user_id", "created_at" DESC);
CREATE INDEX "saraya_auth_audit_logs_event_created_idx"
  ON "saraya_auth_audit_logs" ("event", "created_at" DESC);

COMMIT;
