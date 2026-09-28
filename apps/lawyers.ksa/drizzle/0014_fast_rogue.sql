CREATE TABLE IF NOT EXISTS "booking_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lang" text DEFAULT 'ar' NOT NULL,
	"service" text NOT NULL,
	"consultation_type" text NOT NULL,
	"consultation_method" text NOT NULL,
	"consultation_price" text NOT NULL,
	"amount_bd" numeric(10, 3) NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"video_provider" text,
	"appointment_date" text NOT NULL,
	"appointment_time" text NOT NULL,
	"assignment_mode" text NOT NULL,
	"selected_office_id" text,
	"selected_office_name" text,
	"selected_lawyer_id" uuid,
	"selected_lawyer_name" text,
	"assigned_to_email" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_message" text,
	"payment_status" text DEFAULT 'pending_payment' NOT NULL,
	"admin_status" text DEFAULT 'pending_review' NOT NULL,
	"tap_charge_id" text,
	"tap_status" text,
	"request_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tap_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "profile_image_url" text;
--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "profile_image_blob_path" text;
--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "license_file_url" text;
--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "license_file_blob_path" text;
--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "signature_image_url" text;
--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "signature_image_blob_path" text;
--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "membership_no" text;
--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "invite_token" text;
--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "invite_token_expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "profile_completed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "invited_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "completed_profile_at" timestamp with time zone;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_requests_selected_lawyer_id_bahrain_lawyers_id_fk'
  ) THEN
    ALTER TABLE "booking_requests"
      ADD CONSTRAINT "booking_requests_selected_lawyer_id_bahrain_lawyers_id_fk"
      FOREIGN KEY ("selected_lawyer_id")
      REFERENCES "public"."bahrain_lawyers"("id")
      ON DELETE no action
      ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_requests_assigned_to_email_idx" ON "booking_requests" USING btree ("assigned_to_email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_requests_payment_status_idx" ON "booking_requests" USING btree ("payment_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_requests_admin_status_idx" ON "booking_requests" USING btree ("admin_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_requests_tap_charge_id_idx" ON "booking_requests" USING btree ("tap_charge_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_requests_selected_lawyer_id_idx" ON "booking_requests" USING btree ("selected_lawyer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_requests_created_at_idx" ON "booking_requests" USING btree ("created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bahrain_lawyers_membership_no_unique_idx" ON "bahrain_lawyers" USING btree ("membership_no");
