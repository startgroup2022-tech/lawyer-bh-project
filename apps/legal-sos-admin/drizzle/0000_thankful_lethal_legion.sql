CREATE TYPE "public"."case_type" AS ENUM('emergency_consultation', 'emergency_arrest', 'emergency_search', 'emergency_travel_ban', 'emergency_evidence', 'emergency_report', 'emergency_consultation');--> statement-breakpoint
CREATE TYPE "public"."consent_locale" AS ENUM('en', 'ar');--> statement-breakpoint
CREATE TYPE "public"."consent_role" AS ENUM('client', 'advocate');--> statement-breakpoint
CREATE TYPE "public"."country_code" AS ENUM('BH', 'AE', 'SA', 'KW', 'QA', 'OM');--> statement-breakpoint
CREATE TYPE "public"."fulfillment" AS ENUM('remote', 'field');--> statement-breakpoint
CREATE TYPE "public"."id_type" AS ENUM('cpr', 'residence', 'passport');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."push_kind" AS ENUM('web', 'expo');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('none', 'pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('pending', 'mobilizing', 'arrived', 'completed', 'cancelled', 'disputed');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sign_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advocate_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_ref" varchar(32) NOT NULL,
	"case_type" "case_type" NOT NULL,
	"fulfillment" "fulfillment" NOT NULL,
	"country_code" "country_code" DEFAULT 'BH' NOT NULL,
	"language" "consent_locale",
	"client_name" text NOT NULL,
	"client_phone" varchar(32) NOT NULL,
	"client_id_type" "id_type" NOT NULL,
	"client_id_number" text NOT NULL,
	"client_description" text,
	"location_lat" numeric(9, 6),
	"location_lng" numeric(9, 6),
	"location_address" text,
	"location_accuracy_m" integer,
	"consent_id" uuid,
	"assigned_lawyer_id" uuid,
	"last_advocate_lat" numeric(9, 6),
	"last_advocate_lng" numeric(9, 6),
	"last_advocate_at" timestamp with time zone,
	"service_status" "service_status" DEFAULT 'pending' NOT NULL,
	"response_timestamp" timestamp with time zone,
	"arrival_timestamp" timestamp with time zone,
	"completed_timestamp" timestamp with time zone,
	"base_fee_bhd" numeric(10, 3) NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_ref" text,
	"refund_status" "refund_status" DEFAULT 'none' NOT NULL,
	"refund_amount_bhd" numeric(10, 3),
	"refund_ref" text,
	"refund_marked_by" text,
	"settled_at" timestamp with time zone,
	"settled_by" text,
	"rating_stars" integer,
	"rating_comment" text,
	"operator_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "consent_role" NOT NULL,
	"full_name" text NOT NULL,
	"id_type" "id_type" NOT NULL,
	"id_number" text NOT NULL,
	"signature_data_url" text NOT NULL,
	"contract_text_hash" varchar(64) NOT NULL,
	"locale" "consent_locale" NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lawyers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"roll_number" varchar(64) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" text,
	"country_code" "country_code" DEFAULT 'BH' NOT NULL,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"emergency_ready" boolean DEFAULT false NOT NULL,
	"service_radius_km" integer DEFAULT 25 NOT NULL,
	"base_lat" numeric(9, 6),
	"base_lng" numeric(9, 6),
	"rating" numeric(3, 2),
	"total_cases" integer DEFAULT 0 NOT NULL,
	"consent_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"kind" "push_kind" DEFAULT 'web' NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text,
	"auth" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advocate_shifts" ADD CONSTRAINT "advocate_shifts_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_consent_id_consent_log_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."consent_log"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_lawyer_id_lawyers_id_fk" FOREIGN KEY ("assigned_lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lawyers" ADD CONSTRAINT "lawyers_consent_id_consent_log_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."consent_log"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_email_idx" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "shifts_lawyer_day_idx" ON "advocate_shifts" USING btree ("lawyer_id","day_of_week");--> statement-breakpoint
CREATE UNIQUE INDEX "cases_case_ref_idx" ON "cases" USING btree ("case_ref");--> statement-breakpoint
CREATE INDEX "cases_status_idx" ON "cases" USING btree ("service_status");--> statement-breakpoint
CREATE INDEX "cases_payment_idx" ON "cases" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "cases_created_idx" ON "cases" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cases_assigned_idx" ON "cases" USING btree ("assigned_lawyer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lawyers_roll_idx" ON "lawyers" USING btree ("roll_number");--> statement-breakpoint
CREATE UNIQUE INDEX "lawyers_phone_idx" ON "lawyers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "lawyers_active_ready_idx" ON "lawyers" USING btree ("is_active","emergency_ready");--> statement-breakpoint
CREATE UNIQUE INDEX "push_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_lawyer_kind_idx" ON "push_subscriptions" USING btree ("lawyer_id","kind");