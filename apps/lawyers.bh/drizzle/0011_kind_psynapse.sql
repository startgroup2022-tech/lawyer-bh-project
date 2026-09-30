CREATE TYPE "public"."admin_role" AS ENUM('super_admin', 'admin', 'reviewer');--> statement-breakpoint
CREATE TYPE "public"."provider_application_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."provider_subscription_type" AS ENUM('lawyer', 'consultant', 'mediator', 'arbitrator', 'expert', 'private_executor', 'private_notary', 'translator');--> statement-breakpoint

CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

TRUNCATE TABLE "provider_join_applications" RESTART IDENTITY CASCADE;
--> statement-breakpoint

DROP INDEX IF EXISTS "provider_join_applications_email_idx";
--> statement-breakpoint

ALTER TABLE "provider_join_applications"
ALTER COLUMN "subscription_type"
TYPE "public"."provider_subscription_type"
USING "subscription_type"::"public"."provider_subscription_type";
--> statement-breakpoint

ALTER TABLE "provider_join_applications"
ALTER COLUMN "license_number" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "provider_join_applications"
ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint

ALTER TABLE "provider_join_applications"
ALTER COLUMN "status"
TYPE "public"."provider_application_status"
USING "status"::"public"."provider_application_status";
--> statement-breakpoint

ALTER TABLE "provider_join_applications"
ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."provider_application_status";
--> statement-breakpoint

ALTER TABLE "bahrain_lawyers" ADD COLUMN "password_hash" text;
--> statement-breakpoint

ALTER TABLE "provider_join_applications" ADD COLUMN "password_hash" text;
--> statement-breakpoint

ALTER TABLE "provider_join_applications" ADD COLUMN "license_expiry_date" date;
--> statement-breakpoint

ALTER TABLE "provider_join_applications" ADD COLUMN "reviewed_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "provider_join_applications" ADD COLUMN "reviewed_by" text;
--> statement-breakpoint

ALTER TABLE "provider_join_applications" ADD COLUMN "rejection_reason" text;
--> statement-breakpoint

ALTER TABLE "provider_join_applications" ADD COLUMN "approved_lawyer_id" uuid;
--> statement-breakpoint

CREATE UNIQUE INDEX "admin_users_email_unique_idx" ON "admin_users" USING btree ("email");
--> statement-breakpoint

CREATE INDEX "admin_users_role_idx" ON "admin_users" USING btree ("role");
--> statement-breakpoint

CREATE INDEX "admin_users_active_idx" ON "admin_users" USING btree ("is_active");
--> statement-breakpoint

ALTER TABLE "provider_join_applications"
ADD CONSTRAINT "provider_join_applications_approved_lawyer_id_bahrain_lawyers_id_fk"
FOREIGN KEY ("approved_lawyer_id")
REFERENCES "public"."bahrain_lawyers"("id")
ON DELETE no action
ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX "provider_join_applications_email_unique_idx" ON "provider_join_applications" USING btree ("email");
--> statement-breakpoint

CREATE UNIQUE INDEX "provider_join_applications_license_number_unique_idx" ON "provider_join_applications" USING btree ("license_number");
--> statement-breakpoint

CREATE INDEX "provider_join_applications_subscription_type_idx" ON "provider_join_applications" USING btree ("subscription_type");