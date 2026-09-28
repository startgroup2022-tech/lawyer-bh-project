CREATE TABLE "lawyer_license_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"license_expiry_date" date NOT NULL,
	"reminder_kind" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"claimed_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lawyer_license_notifications_kind_check" CHECK ("reminder_kind" IN ('30_days', '7_days'))
);
--> statement-breakpoint
ALTER TABLE "lawyer_license_notifications" ADD CONSTRAINT "lawyer_license_notifications_lawyer_id_bahrain_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."bahrain_lawyers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "lawyer_license_notifications_delivery_uidx" ON "lawyer_license_notifications" USING btree ("lawyer_id", "license_expiry_date", "reminder_kind");
--> statement-breakpoint
CREATE INDEX "lawyer_license_notifications_pending_idx" ON "lawyer_license_notifications" USING btree ("sent_at", "claimed_at");
