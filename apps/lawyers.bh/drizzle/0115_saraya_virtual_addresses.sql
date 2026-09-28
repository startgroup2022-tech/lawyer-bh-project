CREATE TABLE IF NOT EXISTS "saraya_virtual_addresses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "slot_number" integer NOT NULL,
  "code" varchar(32) NOT NULL,
  "status" varchar(16) DEFAULT 'available' NOT NULL,
  "tenant_organization_id" uuid,
  "business_name_ar" text,
  "business_name_en" text,
  "monthly_fee" numeric(14,3),
  "start_date" date,
  "end_date" date,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_virtual_addresses_property_fk" FOREIGN KEY ("property_id") REFERENCES "public"."saraya_properties"("id") ON DELETE restrict,
  CONSTRAINT "saraya_virtual_addresses_property_tenant_fk" FOREIGN KEY ("property_id", "tenant_organization_id") REFERENCES "public"."saraya_tenant_organizations"("property_id", "id") ON DELETE restrict,
  CONSTRAINT "saraya_virtual_addresses_property_slot_key" UNIQUE("property_id", "slot_number"),
  CONSTRAINT "saraya_virtual_addresses_property_code_key" UNIQUE("property_id", "code"),
  CONSTRAINT "saraya_virtual_addresses_slot_check" CHECK ("slot_number" BETWEEN 1 AND 50),
  CONSTRAINT "saraya_virtual_addresses_status_check" CHECK ("status" IN ('available', 'reserved', 'active', 'suspended', 'inactive')),
  CONSTRAINT "saraya_virtual_addresses_fee_check" CHECK ("monthly_fee" IS NULL OR "monthly_fee" >= 0),
  CONSTRAINT "saraya_virtual_addresses_dates_check" CHECK ("end_date" IS NULL OR "start_date" IS NULL OR "end_date" >= "start_date")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saraya_virtual_addresses_property_status_idx"
  ON "saraya_virtual_addresses" ("property_id", "status");
--> statement-breakpoint
INSERT INTO "saraya_virtual_addresses" ("property_id", "slot_number", "code")
SELECT p.id, slots.slot_number, 'VA-' || lpad(slots.slot_number::text, 3, '0')
FROM "saraya_properties" p
CROSS JOIN generate_series(1, 50) AS slots(slot_number)
WHERE p.code = 'SARAYA-SQUARE'
ON CONFLICT ("property_id", "slot_number") DO NOTHING;
