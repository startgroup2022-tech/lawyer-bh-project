CREATE EXTENSION IF NOT EXISTS citext;

SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "saraya_units"
    WHERE "id" = '00000000-0000-0000-0000-000000000000'::uuid
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Cannot reserve the zero UUID for property-wide Saraya viewing slots because an existing unit already uses it.',
      HINT = 'Assign the conflicting unit a deliberate non-zero UUID before rerunning migration 0121; no unit was changed.';
  END IF;
END $$;

ALTER TABLE "saraya_units"
  ADD CONSTRAINT "saraya_units_reserved_zero_id_check"
    CHECK ("id" <> '00000000-0000-0000-0000-000000000000'::uuid);

CREATE TABLE "saraya_viewing_slots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "unit_id" uuid,
  "unit_scope_id" uuid GENERATED ALWAYS AS (COALESCE("unit_id", '00000000-0000-0000-0000-000000000000'::uuid)) STORED,
  "start_at" timestamp (3) with time zone NOT NULL,
  "end_at" timestamp (3) with time zone NOT NULL,
  "capacity" integer DEFAULT 1 NOT NULL,
  "booked_count" integer DEFAULT 0 NOT NULL,
  "status" varchar(24) DEFAULT 'active' NOT NULL,
  "instructions_ar" text,
  "instructions_en" text,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_viewing_slots_property_id_key" UNIQUE("property_id", "id"),
  CONSTRAINT "saraya_viewing_slots_property_id_scope_key" UNIQUE("property_id", "id", "unit_scope_id"),
  CONSTRAINT "saraya_viewing_slots_time_check" CHECK ("end_at" > "start_at"),
  CONSTRAINT "saraya_viewing_slots_capacity_check" CHECK ("capacity" > 0 AND "booked_count" >= 0 AND "booked_count" <= "capacity"),
  CONSTRAINT "saraya_viewing_slots_status_check" CHECK ("status" IN ('active', 'disabled', 'cancelled')),
  CONSTRAINT "saraya_viewing_slots_property_fk" FOREIGN KEY ("property_id") REFERENCES "saraya_properties"("id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_viewing_slots_property_unit_fk" FOREIGN KEY ("property_id", "unit_id") REFERENCES "saraya_units"("property_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_viewing_slots_created_by_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "saraya_users"("id") ON DELETE RESTRICT
);

CREATE INDEX "saraya_viewing_slots_active_start_idx"
  ON "saraya_viewing_slots" ("property_id", "unit_id", "status", "start_at");

CREATE TABLE "saraya_viewing_appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "unit_id" uuid NOT NULL,
  "slot_id" uuid NOT NULL,
  "slot_unit_scope_id" uuid NOT NULL,
  "user_id" uuid,
  "reference" varchar(32) NOT NULL,
  "visitor_name" text NOT NULL,
  "visitor_phone" text NOT NULL,
  "visitor_email" citext NOT NULL,
  "locale" varchar(8) NOT NULL,
  "status" varchar(24) DEFAULT 'confirmed' NOT NULL,
  "idempotency_key" varchar(128) NOT NULL,
  "internal_notes" text,
  "cancelled_at" timestamp (3) with time zone,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_viewing_appointments_property_id_key" UNIQUE("property_id", "id"),
  CONSTRAINT "saraya_viewing_appointments_property_reference_key" UNIQUE("property_id", "reference"),
  CONSTRAINT "saraya_viewing_appointments_status_check" CHECK ("status" IN ('confirmed', 'completed', 'no_show', 'cancelled')),
  CONSTRAINT "saraya_viewing_appointments_locale_check" CHECK ("locale" IN ('ar', 'en')),
  CONSTRAINT "saraya_viewing_appointments_slot_unit_scope_check" CHECK ("slot_unit_scope_id" = "unit_id" OR "slot_unit_scope_id" = '00000000-0000-0000-0000-000000000000'::uuid),
  CONSTRAINT "saraya_viewing_appointments_property_fk" FOREIGN KEY ("property_id") REFERENCES "saraya_properties"("id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_viewing_appointments_property_slot_unit_fk" FOREIGN KEY ("property_id", "slot_id", "slot_unit_scope_id") REFERENCES "saraya_viewing_slots"("property_id", "id", "unit_scope_id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_viewing_appointments_property_unit_fk" FOREIGN KEY ("property_id", "unit_id") REFERENCES "saraya_units"("property_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_viewing_appointments_user_fk" FOREIGN KEY ("user_id") REFERENCES "saraya_users"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "saraya_viewing_appointments_idempotency_uidx"
  ON "saraya_viewing_appointments" ("idempotency_key");
CREATE INDEX "saraya_viewing_appointments_property_status_created_idx"
  ON "saraya_viewing_appointments" ("property_id", "status", "created_at" DESC);

CREATE TABLE "saraya_viewing_commands" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "idempotency_key" varchar(128) NOT NULL,
  "action" varchar(64) NOT NULL,
  "entity_type" varchar(32) NOT NULL,
  "entity_id" uuid NOT NULL,
  "normalized_input_hash" char(64) NOT NULL,
  "normalized_input" jsonb NOT NULL,
  "result" jsonb NOT NULL,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_viewing_commands_idempotency_key_check" CHECK (NULLIF(BTRIM("idempotency_key"), '') IS NOT NULL),
  CONSTRAINT "saraya_viewing_commands_action_check" CHECK ("action" IN ('viewing_slot.create', 'viewing_slot.update', 'viewing_appointment.status')),
  CONSTRAINT "saraya_viewing_commands_entity_type_check" CHECK ("entity_type" IN ('viewing_slot', 'viewing_appointment')),
  CONSTRAINT "saraya_viewing_commands_input_hash_check" CHECK ("normalized_input_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "saraya_viewing_commands_result_check" CHECK (
    jsonb_typeof("result") = 'object'
    AND "result" ? 'entityId'
    AND "result" ? 'status'
    AND "result" - ARRAY['entityId', 'status'] = '{}'::jsonb
  ),
  CONSTRAINT "saraya_viewing_commands_property_fk" FOREIGN KEY ("property_id") REFERENCES "saraya_properties"("id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_viewing_commands_actor_fk" FOREIGN KEY ("actor_user_id") REFERENCES "saraya_users"("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "saraya_viewing_commands_actor_key_uidx"
  ON "saraya_viewing_commands" ("actor_user_id", "idempotency_key");
CREATE INDEX "saraya_viewing_commands_property_entity_idx"
  ON "saraya_viewing_commands" ("property_id", "entity_type", "entity_id");

ALTER TABLE "saraya_properties"
  ADD COLUMN "rental_approval_mode" varchar(24) DEFAULT 'owner_review' NOT NULL,
  ADD CONSTRAINT "saraya_properties_rental_approval_mode_check"
    CHECK ("rental_approval_mode" IN ('instant', 'owner_review'));

ALTER TABLE "saraya_units"
  ADD COLUMN "rental_approval_override" varchar(24),
  ADD CONSTRAINT "saraya_units_rental_approval_override_check"
    CHECK ("rental_approval_override" IS NULL OR "rental_approval_override" IN ('instant', 'owner_review'));

ALTER TABLE "saraya_rental_requests"
  ADD COLUMN "resolved_approval_mode" varchar(24) DEFAULT 'owner_review' NOT NULL,
  ADD COLUMN "applicant_type" varchar(16) DEFAULT 'individual' NOT NULL,
  ADD COLUMN "applicant_name_ar" text,
  ADD COLUMN "applicant_name_en" text,
  ADD COLUMN "registration_number" text,
  ADD COLUMN "lease_id" uuid,
  ADD COLUMN "checkout_expires_at" timestamp (3) with time zone,
  ADD CONSTRAINT "saraya_rental_requests_resolved_approval_mode_check"
    CHECK ("resolved_approval_mode" IN ('instant', 'owner_review')),
  ADD CONSTRAINT "saraya_rental_requests_applicant_type_check"
    CHECK ("applicant_type" IN ('individual', 'company')),
  ADD CONSTRAINT "saraya_rental_requests_company_registration_check"
    CHECK ("applicant_type" = 'individual' OR NULLIF(BTRIM("registration_number"), '') IS NOT NULL),
  ADD CONSTRAINT "saraya_rental_requests_property_lease_fk"
    FOREIGN KEY ("property_id", "lease_id") REFERENCES "saraya_leases"("property_id", "id") ON DELETE RESTRICT;

DO $$
DECLARE
  conflicts text;
BEGIN
  SELECT string_agg(
    format('%s/%s (%s active requests)', "property_id", "unit_id", active_count),
    ', '
  )
  INTO conflicts
  FROM (
    SELECT "property_id", "unit_id", COUNT(*) AS active_count
    FROM "saraya_rental_requests"
    WHERE "status" IN ('pending_owner_review', 'approved_awaiting_payment', 'paid_awaiting_signature')
    GROUP BY "property_id", "unit_id"
    HAVING COUNT(*) > 1
    ORDER BY "property_id", "unit_id"
    LIMIT 20
  ) conflicting_units;

  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Cannot enforce one active Saraya rental request per unit. Conflicts: ' || conflicts,
      HINT = 'Resolve each listed unit explicitly before rerunning migration 0121; no historical request was changed.';
  END IF;
END $$;

CREATE UNIQUE INDEX "saraya_rental_requests_active_unit_uidx"
  ON "saraya_rental_requests" ("property_id", "unit_id")
  WHERE "status" IN ('pending_owner_review', 'approved_awaiting_payment', 'paid_awaiting_signature');
CREATE UNIQUE INDEX "saraya_rental_requests_property_lease_uidx"
  ON "saraya_rental_requests" ("property_id", "lease_id")
  WHERE "lease_id" IS NOT NULL;

ALTER TABLE "saraya_documents"
  ADD CONSTRAINT "saraya_documents_property_id_key" UNIQUE("property_id", "id");

ALTER TABLE "saraya_payment_demands"
  ADD COLUMN "payment_method" varchar(24),
  ADD COLUMN "provider" varchar(32),
  ADD COLUMN "provider_reference" varchar(160),
  ADD COLUMN "receipt_document_id" uuid,
  ADD COLUMN "verified_by_user_id" uuid,
  ADD COLUMN "verified_at" timestamp (3) with time zone,
  ADD COLUMN "failure_code" text,
  ADD CONSTRAINT "saraya_payment_demands_payment_method_check"
    CHECK ("payment_method" IS NULL OR "payment_method" IN ('online', 'bank_transfer', 'cash', 'card_terminal')),
  ADD CONSTRAINT "saraya_payment_demands_property_receipt_fk"
    FOREIGN KEY ("property_id", "receipt_document_id") REFERENCES "saraya_documents"("property_id", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "saraya_payment_demands_verified_by_fk"
    FOREIGN KEY ("verified_by_user_id") REFERENCES "saraya_users"("id") ON DELETE RESTRICT;

CREATE UNIQUE INDEX "saraya_payment_demands_provider_reference_uidx"
  ON "saraya_payment_demands" ("provider", "provider_reference")
  WHERE "provider_reference" IS NOT NULL;

CREATE TABLE "saraya_lease_signature_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "lease_id" uuid NOT NULL,
  "signer_role" varchar(16) NOT NULL,
  "signer_user_id" uuid NOT NULL,
  "status" varchar(24) DEFAULT 'pending' NOT NULL,
  "token_hash" text NOT NULL,
  "accepted_name" text,
  "ip_address" text,
  "user_agent" text,
  "signed_at" timestamp (3) with time zone,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_lease_signature_requests_property_id_key" UNIQUE("property_id", "id"),
  CONSTRAINT "saraya_lease_signature_requests_property_lease_role_key" UNIQUE("property_id", "lease_id", "signer_role"),
  CONSTRAINT "saraya_lease_signature_requests_token_hash_key" UNIQUE("token_hash"),
  CONSTRAINT "saraya_lease_signature_requests_signer_role_check" CHECK ("signer_role" IN ('tenant', 'owner')),
  CONSTRAINT "saraya_lease_signature_requests_status_check" CHECK ("status" IN ('pending', 'signed', 'declined', 'expired', 'cancelled')),
  CONSTRAINT "saraya_lease_signature_requests_signed_proof_check" CHECK ("status" <> 'signed' OR ("signed_at" IS NOT NULL AND NULLIF(BTRIM("accepted_name"), '') IS NOT NULL)),
  CONSTRAINT "saraya_lease_signature_requests_property_lease_fk" FOREIGN KEY ("property_id", "lease_id") REFERENCES "saraya_leases"("property_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_lease_signature_requests_signer_user_fk" FOREIGN KEY ("signer_user_id") REFERENCES "saraya_users"("id") ON DELETE RESTRICT
);

CREATE INDEX "saraya_lease_signature_requests_property_lease_status_idx"
  ON "saraya_lease_signature_requests" ("property_id", "lease_id", "status");
CREATE INDEX "saraya_lease_signature_requests_signer_status_idx"
  ON "saraya_lease_signature_requests" ("signer_user_id", "status", "created_at" DESC);

ALTER TABLE "saraya_auth_challenges"
  DROP CONSTRAINT "saraya_auth_challenges_purpose_check",
  ADD CONSTRAINT "saraya_auth_challenges_purpose_check"
    CHECK ("purpose" IN ('activate', 'forgot_password', 'phone_otp', 'public_rental_otp'));
