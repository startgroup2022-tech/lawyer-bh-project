ALTER TABLE "saraya_lease_signature_requests"
  ADD COLUMN "accepted_checksum" text,
  ADD COLUMN "evidence_digest" text,
  ADD COLUMN "actor_role" varchar(24);

ALTER TABLE "saraya_lease_signature_requests"
  ADD CONSTRAINT "saraya_lease_signature_requests_evidence_check"
    CHECK ("status" <> 'signed' OR (
      "accepted_checksum" ~ '^[0-9a-f]{64}$' AND
      "evidence_digest" ~ '^[0-9a-f]{64}$' AND
      "actor_role" IN ('tenant','owner','authorized_admin')
    ));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "saraya_tenant_organizations"
    WHERE NULLIF(btrim("registration_number"),'') IS NOT NULL
    GROUP BY "property_id", lower(regexp_replace(btrim("registration_number"), '\s+', '', 'g'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION '0126 preflight: duplicate normalized tenant registration; resolve the conflicting tenant organizations manually before retrying';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "saraya_contacts"
    WHERE "tenant_organization_id" IS NOT NULL AND "user_id" IS NOT NULL
    GROUP BY "property_id", "user_id"
    HAVING count(DISTINCT "tenant_organization_id") > 1
  ) THEN
    RAISE EXCEPTION '0126 preflight: verified user is linked to multiple tenant organizations; resolve the conflicting contacts manually before retrying';
  END IF;
END $$;

CREATE UNIQUE INDEX "saraya_tenant_orgs_property_registration_uidx"
  ON "saraya_tenant_organizations" ("property_id", lower(regexp_replace(btrim("registration_number"), '\s+', '', 'g')))
  WHERE NULLIF(btrim("registration_number"),'') IS NOT NULL;
CREATE UNIQUE INDEX "saraya_contacts_property_verified_tenant_user_uidx"
  ON "saraya_contacts" ("property_id", "user_id")
  WHERE "tenant_organization_id" IS NOT NULL AND "user_id" IS NOT NULL;

CREATE TABLE "saraya_lease_packages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "lease_id" uuid NOT NULL,
  "lease_version_id" uuid NOT NULL,
  "rental_request_id" uuid NOT NULL,
  "lease_checksum" text NOT NULL,
  "draft_document_id" uuid NOT NULL,
  "final_document_id" uuid,
  "final_document_checksum" text,
  "finalization_state" varchar(16) DEFAULT 'pending' NOT NULL,
  "finalization_started_at" timestamptz(3),
  "final_generated_at" timestamptz(3),
  "pending_signature" jsonb,
  "prepared_document_id" uuid,
  "prepared_storage_key" text,
  "prepared_document_checksum" text,
  "prepared_size_bytes" integer,
  "snapshot" jsonb NOT NULL,
  "generated_at" timestamptz(3) NOT NULL,
  "finalized_at" timestamptz(3),
  "created_at" timestamptz(3) DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_lease_packages_property_lease_key" UNIQUE("property_id","lease_id"),
  CONSTRAINT "saraya_lease_packages_request_key" UNIQUE("rental_request_id"),
  CONSTRAINT "saraya_lease_packages_version_key" UNIQUE("lease_version_id"),
  CONSTRAINT "saraya_lease_packages_checksum_check" CHECK ("lease_checksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "saraya_lease_packages_final_checksum_check" CHECK ("final_document_checksum" IS NULL OR "final_document_checksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "saraya_lease_packages_snapshot_check" CHECK (jsonb_typeof("snapshot")='object'),
  CONSTRAINT "saraya_lease_packages_finalization_check" CHECK (
    ("finalization_state"='pending' AND "final_document_id" IS NULL AND "final_document_checksum" IS NULL AND "finalized_at" IS NULL AND "finalization_started_at" IS NULL AND "final_generated_at" IS NULL AND "pending_signature" IS NULL AND "prepared_document_id" IS NULL AND "prepared_storage_key" IS NULL AND "prepared_document_checksum" IS NULL AND "prepared_size_bytes" IS NULL)
    OR ("finalization_state"='preparing' AND "final_document_id" IS NULL AND "final_document_checksum" IS NULL AND "finalized_at" IS NULL AND "finalization_started_at" IS NOT NULL AND "final_generated_at" IS NOT NULL AND jsonb_typeof("pending_signature")='object' AND (("prepared_document_id" IS NULL AND "prepared_storage_key" IS NULL AND "prepared_document_checksum" IS NULL AND "prepared_size_bytes" IS NULL) OR ("prepared_document_id" IS NOT NULL AND NULLIF("prepared_storage_key",'') IS NOT NULL AND "prepared_document_checksum" ~ '^[0-9a-f]{64}$' AND "prepared_size_bytes" > 0)))
    OR ("finalization_state"='finalized' AND "final_document_id" IS NOT NULL AND "final_document_checksum" IS NOT NULL AND "finalized_at" IS NOT NULL AND "final_generated_at" IS NOT NULL AND "pending_signature" IS NULL AND "prepared_document_id" IS NULL AND "prepared_storage_key" IS NULL AND "prepared_document_checksum" IS NULL AND "prepared_size_bytes" IS NULL)
  ),
  CONSTRAINT "saraya_lease_packages_property_lease_fk" FOREIGN KEY("property_id","lease_id") REFERENCES "saraya_leases"("property_id","id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_lease_packages_property_version_fk" FOREIGN KEY("property_id","lease_id","lease_version_id") REFERENCES "saraya_lease_versions"("property_id","lease_id","id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_lease_packages_property_request_fk" FOREIGN KEY("property_id","rental_request_id") REFERENCES "saraya_rental_requests"("property_id","id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_lease_packages_draft_document_fk" FOREIGN KEY("draft_document_id") REFERENCES "saraya_documents"("id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_lease_packages_final_document_fk" FOREIGN KEY("final_document_id") REFERENCES "saraya_documents"("id") ON DELETE RESTRICT
);

CREATE INDEX "saraya_lease_packages_property_lease_idx" ON "saraya_lease_packages"("property_id","lease_id");

CREATE TABLE "saraya_lease_signature_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "lease_id" uuid NOT NULL,
  "signer_role" varchar(16) NOT NULL,
  "previous_signer_user_id" uuid,
  "previous_actor_role" varchar(24),
  "evidence_digest" text,
  "reason" varchar(48) NOT NULL,
  "details" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz(3) DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_lease_signature_events_role_check" CHECK ("signer_role" IN ('tenant','owner')),
  CONSTRAINT "saraya_lease_signature_events_property_lease_fk" FOREIGN KEY("property_id","lease_id") REFERENCES "saraya_leases"("property_id","id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_lease_signature_events_previous_user_fk" FOREIGN KEY("previous_signer_user_id") REFERENCES "saraya_users"("id") ON DELETE RESTRICT
);
CREATE INDEX "saraya_lease_signature_events_lease_idx" ON "saraya_lease_signature_events"("property_id","lease_id","created_at");

CREATE FUNCTION saraya_protect_lease_package_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'saraya lease package cannot be deleted';
  END IF;
  IF NEW."property_id" <> OLD."property_id"
     OR NEW."lease_id" <> OLD."lease_id"
     OR NEW."lease_version_id" <> OLD."lease_version_id"
     OR NEW."rental_request_id" <> OLD."rental_request_id"
     OR NEW."lease_checksum" <> OLD."lease_checksum"
     OR NEW."draft_document_id" <> OLD."draft_document_id"
     OR NEW."snapshot" <> OLD."snapshot"
     OR NEW."generated_at" <> OLD."generated_at" THEN
    RAISE EXCEPTION 'saraya lease package snapshot is immutable';
  END IF;
  IF OLD."final_document_id" IS NOT NULL AND (
       NEW."final_document_id" IS DISTINCT FROM OLD."final_document_id"
       OR NEW."final_document_checksum" IS DISTINCT FROM OLD."final_document_checksum"
       OR NEW."finalized_at" IS DISTINCT FROM OLD."finalized_at"
       OR NEW."final_generated_at" IS DISTINCT FROM OLD."final_generated_at"
       OR NEW."finalization_state" IS DISTINCT FROM OLD."finalization_state") THEN
    RAISE EXCEPTION 'saraya final lease document is immutable';
  END IF;
  IF OLD."final_document_id" IS NULL AND NEW."final_document_id" IS NOT NULL AND NOT (
       OLD."finalization_state"='preparing' AND NEW."finalization_state"='finalized') THEN
    RAISE EXCEPTION 'invalid saraya final lease transition';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "saraya_lease_package_snapshot_immutable" BEFORE UPDATE OR DELETE ON "saraya_lease_packages" FOR EACH ROW EXECUTE FUNCTION saraya_protect_lease_package_snapshot();
