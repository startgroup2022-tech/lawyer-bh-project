CREATE TABLE "saraya_maintenance_tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "unit_id" uuid,
  "tenant_organization_id" uuid,
  "reported_by_user_id" uuid NOT NULL,
  "assigned_to_user_id" uuid,
  "ticket_number" varchar(32) NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "priority" varchar(16) DEFAULT 'medium' NOT NULL,
  "status" varchar(24) DEFAULT 'open' NOT NULL,
  "expense_amount" numeric(14,3) DEFAULT 0 NOT NULL,
  "resolved_at" timestamp(3) with time zone,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_maintenance_tickets_property_id_key" UNIQUE("property_id", "id"),
  CONSTRAINT "saraya_maintenance_tickets_property_number_key" UNIQUE("property_id", "ticket_number"),
  CONSTRAINT "saraya_maintenance_tickets_property_fk" FOREIGN KEY ("property_id") REFERENCES "public"."saraya_properties"("id") ON DELETE restrict,
  CONSTRAINT "saraya_maintenance_tickets_property_unit_fk" FOREIGN KEY ("property_id", "unit_id") REFERENCES "public"."saraya_units"("property_id", "id") ON DELETE restrict,
  CONSTRAINT "saraya_maintenance_tickets_property_tenant_fk" FOREIGN KEY ("property_id", "tenant_organization_id") REFERENCES "public"."saraya_tenant_organizations"("property_id", "id") ON DELETE restrict,
  CONSTRAINT "saraya_maintenance_tickets_reported_by_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."saraya_users"("id") ON DELETE restrict,
  CONSTRAINT "saraya_maintenance_tickets_assigned_to_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."saraya_users"("id") ON DELETE restrict,
  CONSTRAINT "saraya_maintenance_tickets_priority_check" CHECK ("priority" IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT "saraya_maintenance_tickets_status_check" CHECK ("status" IN ('open', 'assigned', 'in_progress', 'awaiting_parts', 'resolved', 'closed', 'cancelled')),
  CONSTRAINT "saraya_maintenance_tickets_expense_check" CHECK ("expense_amount" >= 0)
);
--> statement-breakpoint
CREATE INDEX "saraya_maintenance_tickets_property_status_idx"
  ON "saraya_maintenance_tickets" ("property_id", "status", "priority", "created_at");
--> statement-breakpoint
CREATE INDEX "saraya_maintenance_tickets_assigned_status_idx"
  ON "saraya_maintenance_tickets" ("assigned_to_user_id", "status")
  WHERE "assigned_to_user_id" IS NOT NULL;
