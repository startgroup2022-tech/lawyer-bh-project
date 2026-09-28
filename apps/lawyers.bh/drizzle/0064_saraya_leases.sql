CREATE TYPE "public"."saraya_lease_status" AS ENUM ('draft', 'pending_approval', 'active', 'renewal_requested', 'rejected', 'terminated', 'closed');
CREATE TYPE "public"."saraya_rent_frequency" AS ENUM ('monthly', 'quarterly', 'annual');

CREATE TABLE "saraya_leases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "unit_id" uuid NOT NULL,
  "tenant_organization_id" uuid NOT NULL,
  "status" "saraya_lease_status" DEFAULT 'draft' NOT NULL,
  "current_version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_leases_property_id_key" UNIQUE("property_id", "id"),
  CONSTRAINT "saraya_leases_current_version_check" CHECK ("current_version" > 0)
);

CREATE TABLE "saraya_lease_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "lease_id" uuid NOT NULL,
  "version" integer NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "rent_amount" numeric(14,3) NOT NULL,
  "deposit_amount" numeric(14,3) DEFAULT '0' NOT NULL,
  "frequency" "saraya_rent_frequency" NOT NULL,
  "due_day" integer NOT NULL,
  "grace_days" integer DEFAULT 0 NOT NULL,
  "discount_amount" numeric(14,3) DEFAULT '0' NOT NULL,
  "fee_amount" numeric(14,3) DEFAULT '0' NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_lease_versions_lease_version_key" UNIQUE("lease_id", "version"),
  CONSTRAINT "saraya_lease_versions_property_id_key" UNIQUE("property_id", "id"),
  CONSTRAINT "saraya_lease_versions_property_lease_id_key" UNIQUE("property_id", "lease_id", "id"),
  CONSTRAINT "saraya_lease_versions_property_lease_version_key" UNIQUE("property_id", "lease_id", "version"),
  CONSTRAINT "saraya_lease_versions_date_check" CHECK ("end_date" >= "start_date"),
  CONSTRAINT "saraya_lease_versions_rent_check" CHECK ("rent_amount" > 0),
  CONSTRAINT "saraya_lease_versions_deposit_check" CHECK ("deposit_amount" >= 0),
  CONSTRAINT "saraya_lease_versions_due_day_check" CHECK ("due_day" BETWEEN 1 AND 31),
  CONSTRAINT "saraya_lease_versions_grace_check" CHECK ("grace_days" BETWEEN 0 AND 365),
  CONSTRAINT "saraya_lease_versions_adjustments_check" CHECK ("discount_amount" >= 0 AND "fee_amount" >= 0)
);

CREATE TABLE "saraya_lease_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "lease_id" uuid NOT NULL,
  "from_status" "saraya_lease_status" NOT NULL,
  "to_status" "saraya_lease_status" NOT NULL,
  "command" varchar(32) NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "reason" text,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_lease_events_command_check" CHECK ("command" IN ('submit','approve','reject','request_renewal','approve_renewal','reject_renewal','terminate','close'))
);

CREATE TABLE "saraya_rent_schedule_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "lease_id" uuid NOT NULL,
  "lease_version_id" uuid NOT NULL,
  "sequence" integer NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "due_date" date NOT NULL,
  "grace_until" date NOT NULL,
  "base_amount" numeric(14,3) NOT NULL,
  "discount_amount" numeric(14,3) DEFAULT '0' NOT NULL,
  "fee_amount" numeric(14,3) DEFAULT '0' NOT NULL,
  "total_amount" numeric(14,3) NOT NULL,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_rent_schedule_lease_version_sequence_key" UNIQUE("lease_version_id", "sequence"),
  CONSTRAINT "saraya_rent_schedule_period_check" CHECK ("period_end" >= "period_start"),
  CONSTRAINT "saraya_rent_schedule_grace_check" CHECK ("grace_until" >= "due_date"),
  CONSTRAINT "saraya_rent_schedule_amounts_check" CHECK ("base_amount" >= 0 AND "discount_amount" >= 0 AND "fee_amount" >= 0 AND "total_amount" >= 0)
);

ALTER TABLE "saraya_units" ADD CONSTRAINT "saraya_units_property_id_key" UNIQUE ("property_id", "id");
ALTER TABLE "saraya_leases" ADD CONSTRAINT "saraya_leases_property_id_saraya_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."saraya_properties"("id") ON DELETE restrict;
ALTER TABLE "saraya_leases" ADD CONSTRAINT "saraya_leases_property_unit_fk" FOREIGN KEY ("property_id", "unit_id") REFERENCES "public"."saraya_units"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_leases" ADD CONSTRAINT "saraya_leases_property_tenant_fk" FOREIGN KEY ("property_id", "tenant_organization_id") REFERENCES "public"."saraya_tenant_organizations"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_lease_versions" ADD CONSTRAINT "saraya_lease_versions_property_lease_fk" FOREIGN KEY ("property_id", "lease_id") REFERENCES "public"."saraya_leases"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_lease_versions" ADD CONSTRAINT "saraya_lease_versions_created_by_user_id_saraya_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."saraya_users"("id") ON DELETE set null;
ALTER TABLE "saraya_rent_schedule_items" ADD CONSTRAINT "saraya_rent_schedule_property_lease_fk" FOREIGN KEY ("property_id", "lease_id") REFERENCES "public"."saraya_leases"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_rent_schedule_items" ADD CONSTRAINT "saraya_rent_schedule_property_version_fk" FOREIGN KEY ("property_id", "lease_id", "lease_version_id") REFERENCES "public"."saraya_lease_versions"("property_id", "lease_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_lease_events" ADD CONSTRAINT "saraya_lease_events_property_lease_fk" FOREIGN KEY ("property_id", "lease_id") REFERENCES "public"."saraya_leases"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_lease_events" ADD CONSTRAINT "saraya_lease_events_actor_user_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."saraya_users"("id") ON DELETE restrict;
ALTER TABLE "saraya_leases" ADD CONSTRAINT "saraya_leases_current_version_fk" FOREIGN KEY ("property_id", "id", "current_version") REFERENCES "public"."saraya_lease_versions"("property_id", "lease_id", "version") DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX "saraya_leases_property_status_idx" ON "saraya_leases" USING btree ("property_id", "status");
CREATE INDEX "saraya_leases_property_unit_idx" ON "saraya_leases" USING btree ("property_id", "unit_id");
CREATE INDEX "saraya_leases_property_tenant_idx" ON "saraya_leases" USING btree ("property_id", "tenant_organization_id");
CREATE INDEX "saraya_rent_schedule_property_due_idx" ON "saraya_rent_schedule_items" USING btree ("property_id", "due_date");
CREATE INDEX "saraya_lease_events_property_lease_created_idx" ON "saraya_lease_events" USING btree ("property_id", "lease_id", "created_at");

CREATE FUNCTION saraya_reject_lease_version_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'saraya lease versions are immutable';
END;
$$;
CREATE TRIGGER "saraya_lease_versions_immutable" BEFORE UPDATE OR DELETE ON "saraya_lease_versions" FOR EACH ROW EXECUTE FUNCTION saraya_reject_lease_version_mutation();
CREATE TRIGGER "saraya_rent_schedule_immutable" BEFORE UPDATE OR DELETE ON "saraya_rent_schedule_items" FOR EACH ROW EXECUTE FUNCTION saraya_reject_lease_version_mutation();
CREATE TRIGGER "saraya_lease_events_immutable" BEFORE UPDATE OR DELETE ON "saraya_lease_events" FOR EACH ROW EXECUTE FUNCTION saraya_reject_lease_version_mutation();
