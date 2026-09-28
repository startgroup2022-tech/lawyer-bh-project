CREATE TABLE "saraya_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "unit_id" uuid,
  "tenant_organization_id" uuid,
  "lease_id" uuid,
  "uploaded_by_user_id" uuid NOT NULL,
  "category" varchar(32) NOT NULL,
  "title" text NOT NULL,
  "original_name" text NOT NULL,
  "content_type" varchar(96) NOT NULL,
  "size_bytes" integer NOT NULL,
  "storage_key" text NOT NULL,
  "status" varchar(16) DEFAULT 'active' NOT NULL,
  "expires_on" date,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_documents_property_fk" FOREIGN KEY ("property_id") REFERENCES "saraya_properties"("id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_documents_uploader_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "saraya_users"("id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_documents_property_unit_fk" FOREIGN KEY ("property_id", "unit_id") REFERENCES "saraya_units"("property_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_documents_property_tenant_fk" FOREIGN KEY ("property_id", "tenant_organization_id") REFERENCES "saraya_tenant_organizations"("property_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_documents_property_lease_fk" FOREIGN KEY ("property_id", "lease_id") REFERENCES "saraya_leases"("property_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "saraya_documents_category_check" CHECK ("category" IN ('lease','identity','commercial_registration','handover','invoice','receipt','maintenance','utility','other')),
  CONSTRAINT "saraya_documents_status_check" CHECK ("status" IN ('active','archived')),
  CONSTRAINT "saraya_documents_size_check" CHECK ("size_bytes" > 0 AND "size_bytes" <= 20971520)
);

CREATE UNIQUE INDEX "saraya_documents_property_storage_key_uidx" ON "saraya_documents" ("property_id", "storage_key");
CREATE INDEX "saraya_documents_property_created_idx" ON "saraya_documents" ("property_id", "created_at" DESC);
CREATE INDEX "saraya_documents_property_tenant_idx" ON "saraya_documents" ("property_id", "tenant_organization_id") WHERE "tenant_organization_id" IS NOT NULL;
CREATE INDEX "saraya_documents_property_lease_idx" ON "saraya_documents" ("property_id", "lease_id") WHERE "lease_id" IS NOT NULL;
