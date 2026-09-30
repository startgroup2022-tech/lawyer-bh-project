CREATE TYPE "public"."emergency_case_type" AS ENUM('emergency_arrest', 'emergency_search', 'emergency_travel_ban', 'emergency_evidence', 'emergency_report', 'emergency_consultation');--> statement-breakpoint
CREATE TYPE "public"."id_type" AS ENUM('cpr', 'residence', 'passport');--> statement-breakpoint
CREATE TYPE "public"."party_role" AS ENUM('client', 'advocate');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('pending', 'mobilizing', 'arrived', 'completed', 'cancelled', 'disputed', 'in_progress');--> statement-breakpoint
CREATE TABLE "consent_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"id_type" "id_type" NOT NULL,
	"id_number" text NOT NULL,
	"role" "party_role" NOT NULL,
	"signature_data_url" text,
	"contract_text_hash" text NOT NULL,
	"locale" varchar(5) NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"signed_pdf_base64" text,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_ref" text NOT NULL,
	"consent_id" uuid,
	"case_type" "emergency_case_type" NOT NULL,
	"description" text,
	"location" json,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"contact_id_number" text,
	"base_fee_bhd" numeric(10, 3) NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_ref" text,
	"service_status" "service_status" DEFAULT 'pending' NOT NULL,
	"assigned_lawyer_id" uuid,
	"response_timestamp" timestamp with time zone,
	"arrival_timestamp" timestamp with time zone,
	"completed_timestamp" timestamp with time zone,
	"rating_stars" integer,
	"rating_comment" text,
	"locale" varchar(5) DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emergency_requests_case_ref_unique" UNIQUE("case_ref")
);
--> statement-breakpoint
CREATE TABLE "bahrain_lawyers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"registration_no" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"is_emergency_ready" boolean DEFAULT false NOT NULL,
	"emergency_radius_km" integer DEFAULT 20 NOT NULL,
	"emergency_rates" json,
	"base_location" json,
	"consent_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bahrain_lawyers_registration_no_unique" UNIQUE("registration_no")
);
--> statement-breakpoint
ALTER TABLE "emergency_requests" ADD CONSTRAINT "emergency_requests_consent_id_consent_log_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."consent_log"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_requests" ADD CONSTRAINT "emergency_requests_assigned_lawyer_id_bahrain_lawyers_id_fk" FOREIGN KEY ("assigned_lawyer_id") REFERENCES "public"."bahrain_lawyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD CONSTRAINT "bahrain_lawyers_consent_id_consent_log_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."consent_log"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_log_id_number_idx" ON "consent_log" USING btree ("id_number");--> statement-breakpoint
CREATE INDEX "consent_log_role_idx" ON "consent_log" USING btree ("role");--> statement-breakpoint
CREATE INDEX "emergency_requests_case_ref_idx" ON "emergency_requests" USING btree ("case_ref");--> statement-breakpoint
CREATE INDEX "emergency_requests_status_idx" ON "emergency_requests" USING btree ("service_status");--> statement-breakpoint
CREATE INDEX "emergency_requests_created_idx" ON "emergency_requests" USING btree ("created_at");