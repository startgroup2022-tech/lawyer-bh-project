ALTER TYPE "public"."provider_application_status" ADD VALUE IF NOT EXISTS 'suspended';--> statement-breakpoint
ALTER TYPE "public"."provider_subscription_type" ADD VALUE IF NOT EXISTS 'translator';--> statement-breakpoint

DROP TABLE IF EXISTS "provider_join_applications" CASCADE;--> statement-breakpoint

ALTER TABLE "bahrain_lawyers" DROP CONSTRAINT IF EXISTS "bahrain_lawyers_registration_no_unique";--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ALTER COLUMN "is_active" SET DEFAULT false;--> statement-breakpoint

ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "notary_id" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "subscription_type" "provider_subscription_type" DEFAULT 'lawyer' NOT NULL;--> statement-breakpoint

ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "full_name_ar" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "full_name_en" text DEFAULT '' NOT NULL;--> statement-breakpoint

ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "registration_level" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "experience_years" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'Arabic' NOT NULL;--> statement-breakpoint

ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "specialty_main" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "specialty_subs" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "specialties" json DEFAULT '{"main":"","subs":[]}'::json NOT NULL;--> statement-breakpoint

ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "profile_image_file_name" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "profile_image_mime_type" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "profile_image_base64" text;--> statement-breakpoint

ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "license_expiry_date" date;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "license_file_name" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "license_file_mime_type" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "license_file_base64" text;--> statement-breakpoint

ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "signature_data_url" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "agreement_accepted" boolean DEFAULT false NOT NULL;--> statement-breakpoint

ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "status" "provider_application_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "rejection_reason" text;--> statement-breakpoint

ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "suspension_type" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "suspension_reason" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "suspended_by" text;--> statement-breakpoint

ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "locale" varchar(5) DEFAULT 'ar' NOT NULL;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "ip_address" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "user_agent" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "bahrain_lawyers_notary_id_idx" ON "bahrain_lawyers" USING btree ("notary_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bahrain_lawyers_registration_no_unique_idx" ON "bahrain_lawyers" USING btree ("registration_no");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bahrain_lawyers_email_unique_idx" ON "bahrain_lawyers" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bahrain_lawyers_phone_idx" ON "bahrain_lawyers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bahrain_lawyers_status_idx" ON "bahrain_lawyers" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bahrain_lawyers_subscription_type_idx" ON "bahrain_lawyers" USING btree ("subscription_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bahrain_lawyers_active_idx" ON "bahrain_lawyers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bahrain_lawyers_created_idx" ON "bahrain_lawyers" USING btree ("created_at");--> statement-breakpoint

-- لا تحذف full_name الآن حتى لا نخسر بيانات قديمة.
-- بعد ما تتأكد أن full_name_ar و full_name_en موجودة وتحفظ صح، احذفه لاحقاً.
-- ALTER TABLE "bahrain_lawyers" DROP COLUMN IF EXISTS "full_name";--> statement-breakpoint