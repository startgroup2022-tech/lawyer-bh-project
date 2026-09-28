CREATE TYPE "public"."saraya_rental_request_status" AS ENUM ('pending_owner_review', 'approved_awaiting_payment', 'rejected', 'paid_awaiting_signature', 'completed', 'cancelled');
CREATE TYPE "public"."saraya_invoice_status" AS ENUM ('draft', 'due', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded');
CREATE TYPE "public"."saraya_payment_demand_status" AS ENUM ('pending', 'charge_created', 'captured', 'failed', 'cancelled', 'refunded');
CREATE TYPE "public"."saraya_ledger_entry_type" AS ENUM ('charge', 'payment', 'refund', 'adjustment');

CREATE TABLE "saraya_rental_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "unit_id" uuid NOT NULL,
  "tenant_user_id" uuid NOT NULL,
  "tenant_organization_id" uuid,
  "status" "saraya_rental_request_status" DEFAULT 'pending_owner_review' NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "duration_months" integer NOT NULL,
  "rent_amount" numeric(14,3) NOT NULL,
  "deposit_amount" numeric(14,3) DEFAULT '0' NOT NULL,
  "fee_amount" numeric(14,3) DEFAULT '0' NOT NULL,
  "currency" char(3) DEFAULT 'BHD' NOT NULL,
  "id_document_id" uuid NOT NULL,
  "idempotency_key" varchar(128) NOT NULL,
  "decision_reason" text,
  "decided_by_user_id" uuid,
  "decided_at" timestamp (3) with time zone,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_rental_requests_property_id_key" UNIQUE("property_id", "id"),
  CONSTRAINT "saraya_rental_requests_tenant_idempotency_key" UNIQUE("tenant_user_id", "idempotency_key"),
  CONSTRAINT "saraya_rental_requests_dates_check" CHECK ("end_date" >= "start_date"),
  CONSTRAINT "saraya_rental_requests_duration_check" CHECK ("duration_months" > 0),
  CONSTRAINT "saraya_rental_requests_amounts_check" CHECK ("rent_amount" > 0 AND "deposit_amount" >= 0 AND "fee_amount" >= 0),
  CONSTRAINT "saraya_rental_requests_currency_check" CHECK ("currency" = 'BHD')
);

CREATE TABLE "saraya_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "rental_request_id" uuid NOT NULL,
  "tenant_user_id" uuid NOT NULL,
  "status" "saraya_invoice_status" DEFAULT 'due' NOT NULL,
  "number" varchar(64) NOT NULL,
  "issue_date" date NOT NULL,
  "due_date" date NOT NULL,
  "subtotal_amount" numeric(14,3) NOT NULL,
  "total_amount" numeric(14,3) NOT NULL,
  "paid_amount" numeric(14,3) DEFAULT '0' NOT NULL,
  "currency" char(3) DEFAULT 'BHD' NOT NULL,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_invoices_property_id_key" UNIQUE("property_id", "id"),
  CONSTRAINT "saraya_invoices_property_request_key" UNIQUE("property_id", "rental_request_id"),
  CONSTRAINT "saraya_invoices_property_number_key" UNIQUE("property_id", "number"),
  CONSTRAINT "saraya_invoices_dates_check" CHECK ("due_date" >= "issue_date"),
  CONSTRAINT "saraya_invoices_amounts_check" CHECK ("subtotal_amount" >= 0 AND "total_amount" >= 0 AND "paid_amount" >= 0 AND "paid_amount" <= "total_amount"),
  CONSTRAINT "saraya_invoices_currency_check" CHECK ("currency" = 'BHD')
);

CREATE TABLE "saraya_invoice_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "invoice_id" uuid NOT NULL,
  "kind" varchar(32) NOT NULL,
  "description_ar" text NOT NULL,
  "description_en" text NOT NULL,
  "quantity" numeric(14,3) DEFAULT '1' NOT NULL,
  "unit_amount" numeric(14,3) NOT NULL,
  "amount" numeric(14,3) NOT NULL,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_invoice_items_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "saraya_invoice_items_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "saraya_payment_demands" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "invoice_id" uuid NOT NULL,
  "rental_request_id" uuid NOT NULL,
  "status" "saraya_payment_demand_status" DEFAULT 'pending' NOT NULL,
  "amount" numeric(14,3) NOT NULL,
  "currency" char(3) DEFAULT 'BHD' NOT NULL,
  "idempotency_key" varchar(128) NOT NULL,
  "tap_charge_id" varchar(128),
  "payment_url" text,
  "expires_at" timestamp (3) with time zone,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_payment_demands_property_invoice_key" UNIQUE("property_id", "invoice_id"),
  CONSTRAINT "saraya_payment_demands_idempotency_key" UNIQUE("idempotency_key"),
  CONSTRAINT "saraya_payment_demands_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "saraya_payment_demands_currency_check" CHECK ("currency" = 'BHD')
);

CREATE TABLE "saraya_ledger_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "invoice_id" uuid NOT NULL,
  "entry_type" "saraya_ledger_entry_type" NOT NULL,
  "amount" numeric(14,3) NOT NULL,
  "currency" char(3) DEFAULT 'BHD' NOT NULL,
  "external_reference" varchar(160),
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_ledger_entries_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "saraya_ledger_entries_currency_check" CHECK ("currency" = 'BHD')
);

ALTER TABLE "saraya_rental_requests" ADD CONSTRAINT "saraya_rental_requests_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."saraya_properties"("id") ON DELETE restrict;
ALTER TABLE "saraya_rental_requests" ADD CONSTRAINT "saraya_rental_requests_property_unit_fk" FOREIGN KEY ("property_id", "unit_id") REFERENCES "public"."saraya_units"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_rental_requests" ADD CONSTRAINT "saraya_rental_requests_tenant_user_fk" FOREIGN KEY ("tenant_user_id") REFERENCES "public"."saraya_users"("id") ON DELETE restrict;
ALTER TABLE "saraya_rental_requests" ADD CONSTRAINT "saraya_rental_requests_property_tenant_fk" FOREIGN KEY ("property_id", "tenant_organization_id") REFERENCES "public"."saraya_tenant_organizations"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_rental_requests" ADD CONSTRAINT "saraya_rental_requests_decided_by_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."saraya_users"("id") ON DELETE restrict;
ALTER TABLE "saraya_invoices" ADD CONSTRAINT "saraya_invoices_property_request_fk" FOREIGN KEY ("property_id", "rental_request_id") REFERENCES "public"."saraya_rental_requests"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_invoices" ADD CONSTRAINT "saraya_invoices_tenant_user_fk" FOREIGN KEY ("tenant_user_id") REFERENCES "public"."saraya_users"("id") ON DELETE restrict;
ALTER TABLE "saraya_invoice_items" ADD CONSTRAINT "saraya_invoice_items_property_invoice_fk" FOREIGN KEY ("property_id", "invoice_id") REFERENCES "public"."saraya_invoices"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_payment_demands" ADD CONSTRAINT "saraya_payment_demands_property_invoice_fk" FOREIGN KEY ("property_id", "invoice_id") REFERENCES "public"."saraya_invoices"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_payment_demands" ADD CONSTRAINT "saraya_payment_demands_property_request_fk" FOREIGN KEY ("property_id", "rental_request_id") REFERENCES "public"."saraya_rental_requests"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_ledger_entries" ADD CONSTRAINT "saraya_ledger_entries_property_invoice_fk" FOREIGN KEY ("property_id", "invoice_id") REFERENCES "public"."saraya_invoices"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_ledger_entries" ADD CONSTRAINT "saraya_ledger_entries_created_by_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."saraya_users"("id") ON DELETE restrict;

CREATE INDEX "saraya_rental_requests_property_status_idx" ON "saraya_rental_requests" ("property_id", "status", "created_at");
CREATE INDEX "saraya_rental_requests_tenant_idx" ON "saraya_rental_requests" ("tenant_user_id", "created_at");
CREATE INDEX "saraya_invoices_property_status_due_idx" ON "saraya_invoices" ("property_id", "status", "due_date");
CREATE INDEX "saraya_invoices_tenant_due_idx" ON "saraya_invoices" ("tenant_user_id", "due_date");
CREATE INDEX "saraya_ledger_entries_property_invoice_idx" ON "saraya_ledger_entries" ("property_id", "invoice_id", "created_at");

CREATE FUNCTION saraya_reject_finance_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'saraya issued financial history is immutable';
END;
$$;
CREATE TRIGGER "saraya_invoice_items_immutable" BEFORE UPDATE OR DELETE ON "saraya_invoice_items" FOR EACH ROW EXECUTE FUNCTION saraya_reject_finance_history_mutation();
CREATE TRIGGER "saraya_ledger_entries_immutable" BEFORE UPDATE OR DELETE ON "saraya_ledger_entries" FOR EACH ROW EXECUTE FUNCTION saraya_reject_finance_history_mutation();
