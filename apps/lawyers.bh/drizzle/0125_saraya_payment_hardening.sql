ALTER TABLE "saraya_payment_commands"
  ADD COLUMN "failure_code" varchar(96);

WITH ranked AS (
  SELECT command."id", row_number() OVER (
    PARTITION BY command."payment_demand_id"
    ORDER BY
      (command."provider_reference" = demand."provider_reference") DESC NULLS LAST,
      (command."status"='ready') DESC,
      (command."provider_reference" IS NOT NULL AND command."payment_url" IS NOT NULL) DESC,
      command."created_at" DESC,
      command."id" DESC
  ) AS position
  FROM "saraya_payment_commands" command
  JOIN "saraya_payment_demands" demand ON demand."id"=command."payment_demand_id"
  WHERE command."status" IN ('creating','ready')
)
UPDATE "saraya_payment_commands" command
SET "status"='failed', "failure_code"='MIGRATION_DUPLICATE_SESSION', "payment_url"=NULL, "updated_at"=now()
FROM ranked
WHERE ranked."id"=command."id" AND ranked.position > 1;

CREATE UNIQUE INDEX "saraya_payment_commands_one_active_demand_uidx"
  ON "saraya_payment_commands" ("payment_demand_id")
  WHERE "status" IN ('creating','ready');

ALTER TABLE "saraya_payment_provider_events"
  DROP CONSTRAINT "saraya_payment_provider_events_outcome_check",
  ADD CONSTRAINT "saraya_payment_provider_events_outcome_check"
    CHECK ("outcome" IN ('paid','rejected','failed'));

ALTER TABLE "saraya_payment_proofs"
  ADD COLUMN "rental_request_id" uuid;

UPDATE "saraya_payment_proofs" proof
SET "rental_request_id"=demand."rental_request_id"
FROM "saraya_payment_demands" demand
WHERE demand."id"=proof."payment_demand_id";

ALTER TABLE "saraya_payment_proofs"
  ALTER COLUMN "rental_request_id" SET NOT NULL,
  ADD CONSTRAINT "saraya_payment_proofs_property_request_fk"
    FOREIGN KEY ("property_id", "rental_request_id")
    REFERENCES "saraya_rental_requests"("property_id", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "saraya_payment_proofs_document_key" UNIQUE("document_id");

CREATE TABLE "saraya_payment_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid NOT NULL REFERENCES "saraya_users"("id") ON DELETE RESTRICT,
  "payment_demand_id" uuid NOT NULL REFERENCES "saraya_payment_demands"("id") ON DELETE RESTRICT,
  "action" varchar(40) NOT NULL,
  "idempotency_key" varchar(128) NOT NULL,
  "fingerprint" char(64) NOT NULL,
  "result" jsonb NOT NULL,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_payment_operations_actor_action_key" UNIQUE("actor_user_id", "action", "idempotency_key"),
  CONSTRAINT "saraya_payment_operations_action_check" CHECK ("action" IN ('offline_proof.submit','offline_payment.decide')),
  CONSTRAINT "saraya_payment_operations_fingerprint_check" CHECK ("fingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "saraya_payment_operations_result_check" CHECK (jsonb_typeof("result")='object')
);

CREATE INDEX "saraya_payment_operations_demand_created_idx"
  ON "saraya_payment_operations" ("payment_demand_id", "created_at" DESC);
