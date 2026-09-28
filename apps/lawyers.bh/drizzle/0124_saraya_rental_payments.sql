ALTER TYPE "saraya_payment_demand_status" ADD VALUE IF NOT EXISTS 'verification_pending';
ALTER TYPE "saraya_payment_demand_status" ADD VALUE IF NOT EXISTS 'paid';

CREATE TABLE "saraya_payment_commands" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_user_id" uuid NOT NULL REFERENCES "saraya_users"("id") ON DELETE RESTRICT,
  "rental_request_id" uuid NOT NULL,
  "payment_demand_id" uuid NOT NULL REFERENCES "saraya_payment_demands"("id") ON DELETE RESTRICT,
  "idempotency_key" varchar(128) NOT NULL,
  "fingerprint" char(64) NOT NULL,
  "status" varchar(16) DEFAULT 'creating' NOT NULL,
  "provider_reference" varchar(160),
  "payment_url" text,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_payment_commands_tenant_key" UNIQUE("tenant_user_id", "idempotency_key"),
  CONSTRAINT "saraya_payment_commands_status_check" CHECK ("status" IN ('creating','ready','failed')),
  CONSTRAINT "saraya_payment_commands_fingerprint_check" CHECK ("fingerprint" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "saraya_payment_provider_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" varchar(32) NOT NULL,
  "provider_reference" varchar(160) NOT NULL,
  "payment_demand_id" uuid NOT NULL REFERENCES "saraya_payment_demands"("id") ON DELETE RESTRICT,
  "outcome" varchar(24) NOT NULL,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_payment_provider_events_reference_key" UNIQUE("provider", "provider_reference"),
  CONSTRAINT "saraya_payment_provider_events_outcome_check" CHECK ("outcome" IN ('paid','rejected'))
);

CREATE TABLE "saraya_payment_proofs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "payment_demand_id" uuid NOT NULL REFERENCES "saraya_payment_demands"("id") ON DELETE RESTRICT,
  "document_id" uuid NOT NULL,
  "submitted_by_user_id" uuid NOT NULL REFERENCES "saraya_users"("id") ON DELETE RESTRICT,
  "reference" varchar(160) NOT NULL,
  "status" varchar(24) DEFAULT 'verification_pending' NOT NULL,
  "failure_code" varchar(96),
  "decided_by_user_id" uuid REFERENCES "saraya_users"("id") ON DELETE RESTRICT,
  "decided_at" timestamp (3) with time zone,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_payment_proofs_property_document_fk" FOREIGN KEY ("property_id", "document_id") REFERENCES "saraya_documents"("property_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_payment_proofs_status_check" CHECK ("status" IN ('verification_pending','approved','rejected'))
);

CREATE UNIQUE INDEX "saraya_payment_proofs_one_pending_uidx"
  ON "saraya_payment_proofs" ("payment_demand_id") WHERE "status"='verification_pending';
CREATE INDEX "saraya_payment_proofs_demand_created_idx"
  ON "saraya_payment_proofs" ("payment_demand_id", "created_at" DESC);
