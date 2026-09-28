ALTER TABLE "saraya_documents"
  ADD COLUMN IF NOT EXISTS "applicant_idempotency_key" varchar(128),
  ADD COLUMN IF NOT EXISTS "applicant_fingerprint" char(64);

CREATE UNIQUE INDEX IF NOT EXISTS "saraya_documents_applicant_idempotency_uidx"
  ON "saraya_documents" ("uploaded_by_user_id", "unit_id", "applicant_idempotency_key")
  WHERE "applicant_idempotency_key" IS NOT NULL;

ALTER TABLE "saraya_documents"
  ADD CONSTRAINT "saraya_documents_applicant_fingerprint_check"
  CHECK ("applicant_fingerprint" IS NULL OR "applicant_fingerprint" ~ '^[0-9a-f]{64}$');
