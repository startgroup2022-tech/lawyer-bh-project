WITH selected_proof AS (
  SELECT DISTINCT ON (proof."payment_demand_id")
    proof."payment_demand_id", proof."id"
  FROM "saraya_payment_proofs" proof
  ORDER BY proof."payment_demand_id",
    (proof."status"='approved') DESC,
    (proof."status"='verification_pending') DESC,
    proof."created_at" DESC,
    proof."id" DESC
)
UPDATE "saraya_payment_demands" demand
SET "provider_reference"=selected_proof."id"::text, "updated_at"=now()
FROM selected_proof
WHERE demand."id"=selected_proof."payment_demand_id" AND demand."provider"='offline';

UPDATE "saraya_payment_provider_events" event
SET "provider_reference"=demand."provider_reference"
FROM "saraya_payment_demands" demand
WHERE event."payment_demand_id"=demand."id"
  AND event."provider"='offline'
  AND demand."provider_reference" IS NOT NULL;

ALTER TABLE "saraya_payment_demands"
  ADD CONSTRAINT "saraya_payment_demands_offline_reference_check"
  CHECK (
    "provider" IS DISTINCT FROM 'offline'
    OR "provider_reference" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );
