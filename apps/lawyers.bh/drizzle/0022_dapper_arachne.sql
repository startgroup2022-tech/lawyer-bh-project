CREATE TABLE "bahrain_advocate_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
	"advocate_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_minute_utc" integer NOT NULL,
	"end_minute_utc" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bahrain_booking_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
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
	"legal_case_id" uuid,
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
	"mobile_payment_idempotency_key" uuid,
	"mobile_payment_case_id" text,
	"request_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tap_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bahrain_booking_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
	"booking_request_id" uuid NOT NULL,
	"lawyer_id" uuid,
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"service" text,
	"consultation_type" text,
	"appointment_date" text,
	"appointment_time" text,
	"provider_name" text,
	"review_token_hash" text NOT NULL,
	"review_url" text,
	"review_email_status" text DEFAULT 'pending' NOT NULL,
	"review_email_sent_at" timestamp with time zone,
	"review_email_skipped_at" timestamp with time zone,
	"review_email_error" text,
	"token_expires_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"lawyer_rating" integer,
	"service_speed_rating" integer,
	"service_quality_rating" integer,
	"provider_communication_rating" integer,
	"appointment_commitment_rating" integer,
	"platform_ease_rating" integer,
	"overall_rating" integer,
	"lawyer_comment" text,
	"service_comment" text,
	"public_comment" boolean DEFAULT true NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bahrain_consent_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
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
CREATE TABLE "bahrain_consultation_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
	"code" varchar(32) NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"price" numeric(10, 3) NOT NULL,
	"currency_code" varchar(3) DEFAULT 'BHD' NOT NULL,
	"duration_minutes" integer NOT NULL,
	"icon_key" varchar(64) DEFAULT 'phone' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(2) NOT NULL,
	"table_prefix" varchar(16) NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"phone_code" varchar(8),
	"currency_code" varchar(3) NOT NULL,
	"default_locale" varchar(5) DEFAULT 'ar' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"tables_provisioned" boolean DEFAULT false NOT NULL,
	"provisioned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bahrain_emergency_case_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
	"slug" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"description_ar" text NOT NULL,
	"description_en" text NOT NULL,
	"action_type_ar" text NOT NULL,
	"action_type_en" text NOT NULL,
	"price" numeric(10, 3) NOT NULL,
	"currency_code" varchar(3) DEFAULT 'BHD' NOT NULL,
	"icon_key" varchar(64) DEFAULT 'shield-alert' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bahrain_emergency_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
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
	"settled_at" timestamp with time zone,
	"settled_by" text,
	"internal_notes" json DEFAULT '[]'::json,
	"cancellation_reason" text,
	"refund_status" "refund_status" DEFAULT 'none' NOT NULL,
	"refund_amount_bhd" numeric(10, 3),
	"refund_ref" text,
	"refund_marked_at" timestamp with time zone,
	"refund_marked_by" text,
	"last_advocate_location" json,
	"dispatch_actor_log" json DEFAULT '[]'::json,
	"locale" varchar(5) DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bahrain_emergency_requests_case_ref_unique" UNIQUE("case_ref")
);
--> statement-breakpoint
CREATE TABLE "bahrain_lawyer_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
	"reference" text NOT NULL,
	"status" "agreement_status" DEFAULT 'draft' NOT NULL,
	"lawyer_name" text NOT NULL,
	"lawyer_license_no" text,
	"lawyer_address" text,
	"lawyer_phone" text,
	"lawyer_email" text NOT NULL,
	"client_name" text NOT NULL,
	"client_id_no" text,
	"client_nationality" text,
	"client_address" text,
	"client_phone" text,
	"client_email" text NOT NULL,
	"subject" text NOT NULL,
	"fee_type" "agreement_fee_type" NOT NULL,
	"fee_fixed_amount_bhd" numeric(12, 3),
	"fee_fixed_installment" text,
	"fee_contingency_percent" numeric(5, 2),
	"fee_contingency_basis" "agreement_fee_basis",
	"locale" varchar(5) DEFAULT 'en' NOT NULL,
	"contract_version" text NOT NULL,
	"contract_text_hash" text NOT NULL,
	"sign_token" text,
	"sign_token_expires_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	"signed_by_name" text,
	"signature_data_url" text,
	"signed_ip" text,
	"signed_user_agent" text,
	"signed_pdf_base64" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bahrain_lawyer_agreements_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "bahrain_lawyer_legal_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"legal_case_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bahrain_lawyer_push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
	"advocate_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bahrain_lawyer_push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "bahrain_legal_case_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
	"key" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"description_ar" text,
	"description_en" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_case_guidance" (
	"legal_case_key" text PRIMARY KEY NOT NULL,
	"guidance_ar" text NOT NULL,
	"guidance_en" text NOT NULL,
	"documents_ar" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"documents_en" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"clarifying_question_ar" text,
	"clarifying_question_en" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bahrain_legal_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
	"category_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"description_ar" text,
	"description_en" text,
	"keywords_ar" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords_en" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bahrain_payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
	"booking_request_id" uuid NOT NULL,
	"provider_id" uuid,
	"commission_rate_id" uuid,
	"tap_charge_id" text NOT NULL,
	"currency_code" varchar(3) DEFAULT 'BHD' NOT NULL,
	"gross_amount" numeric(12, 3) NOT NULL,
	"platform_percentage" numeric(5, 2) NOT NULL,
	"provider_percentage" numeric(5, 2) NOT NULL,
	"platform_amount" numeric(12, 3) NOT NULL,
	"provider_amount" numeric(12, 3) NOT NULL,
	"gateway_fee_amount" numeric(12, 3) DEFAULT '0.000' NOT NULL,
	"split_mode" text DEFAULT 'legacy' NOT NULL,
	"destination_id" text,
	"split_executed_at" timestamp with time zone,
	"split_error" text,
	"allocation_status" text DEFAULT 'calculated' NOT NULL,
	"payout_status" text DEFAULT 'pending' NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_out_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_allocations_split_mode_check" CHECK ("bahrain_payment_allocations"."split_mode" IN ('legacy', 'platform_only', 'instant', 'delayed'))
);
--> statement-breakpoint
CREATE TABLE "bahrain_provider_commission_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) DEFAULT 'BH' NOT NULL,
	"provider_id" uuid NOT NULL,
	"platform_percentage" numeric(5, 2) NOT NULL,
	"provider_percentage" numeric(5, 2) NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bahrain_tap_retailer_onboarding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"marketplace_mid" text NOT NULL,
	"stage" text DEFAULT 'pending_admin' NOT NULL,
	"commercial_registration_file_id" text,
	"personal_id_file_id" text,
	"iban_certificate_file_id" text,
	"lead_id" text,
	"retailer_id" text,
	"destination_id" text,
	"kyc_status" text DEFAULT 'pending' NOT NULL,
	"payout_enabled" boolean DEFAULT false NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_completed_stage" text,
	"last_error_code" text,
	"last_error_message" text,
	"last_attempt_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tap_retailer_onboarding_environment_check" CHECK ("bahrain_tap_retailer_onboarding"."environment" IN ('test', 'live')),
	CONSTRAINT "tap_retailer_onboarding_stage_check" CHECK ("bahrain_tap_retailer_onboarding"."stage" IN ('pending_admin', 'tap_uploading_files', 'tap_creating_lead', 'tap_creating_retailer', 'tap_kyc_pending', 'tap_failed', 'active')),
	CONSTRAINT "tap_retailer_onboarding_attempt_count_check" CHECK ("bahrain_tap_retailer_onboarding"."attempt_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "advocate_shifts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "booking_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "consent_log" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "emergency_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lawyer_agreements" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lawyer_push_subscriptions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "advocate_shifts" CASCADE;--> statement-breakpoint
DROP TABLE "booking_requests" CASCADE;--> statement-breakpoint
DROP TABLE "consent_log" CASCADE;--> statement-breakpoint
DROP TABLE "emergency_requests" CASCADE;--> statement-breakpoint
DROP TABLE "lawyer_agreements" CASCADE;--> statement-breakpoint
DROP TABLE "lawyer_push_subscriptions" CASCADE;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" DROP CONSTRAINT "bahrain_lawyers_consent_id_consent_log_id_fk";
--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ALTER COLUMN "working_hours" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ALTER COLUMN "working_hours" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "country_code" varchar(2) DEFAULT 'BH' NOT NULL;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "iban_number" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "cr_number" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "institution_license_file_name" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "institution_license_file_mime_type" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "institution_license_file_url" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "institution_license_file_blob_path" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "iban_certificate_file_name" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "iban_certificate_file_mime_type" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "iban_certificate_file_url" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "iban_certificate_file_blob_path" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "personal_id_file_name" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "personal_id_file_mime_type" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "personal_id_file_url" text;--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD COLUMN "personal_id_file_blob_path" text;--> statement-breakpoint
ALTER TABLE "bahrain_advocate_shifts" ADD CONSTRAINT "bahrain_advocate_shifts_advocate_id_bahrain_lawyers_id_fk" FOREIGN KEY ("advocate_id") REFERENCES "public"."bahrain_lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_booking_requests" ADD CONSTRAINT "bahrain_booking_requests_legal_case_id_bahrain_legal_cases_id_fk" FOREIGN KEY ("legal_case_id") REFERENCES "public"."bahrain_legal_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_booking_requests" ADD CONSTRAINT "bahrain_booking_requests_selected_lawyer_id_bahrain_lawyers_id_fk" FOREIGN KEY ("selected_lawyer_id") REFERENCES "public"."bahrain_lawyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_booking_reviews" ADD CONSTRAINT "bahrain_booking_reviews_booking_request_id_bahrain_booking_requests_id_fk" FOREIGN KEY ("booking_request_id") REFERENCES "public"."bahrain_booking_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_booking_reviews" ADD CONSTRAINT "bahrain_booking_reviews_lawyer_id_bahrain_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."bahrain_lawyers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_emergency_requests" ADD CONSTRAINT "bahrain_emergency_requests_consent_id_bahrain_consent_log_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."bahrain_consent_log"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_emergency_requests" ADD CONSTRAINT "bahrain_emergency_requests_assigned_lawyer_id_bahrain_lawyers_id_fk" FOREIGN KEY ("assigned_lawyer_id") REFERENCES "public"."bahrain_lawyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_lawyer_legal_cases" ADD CONSTRAINT "bahrain_lawyer_legal_cases_lawyer_id_bahrain_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."bahrain_lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_lawyer_legal_cases" ADD CONSTRAINT "bahrain_lawyer_legal_cases_legal_case_id_bahrain_legal_cases_id_fk" FOREIGN KEY ("legal_case_id") REFERENCES "public"."bahrain_legal_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_lawyer_push_subscriptions" ADD CONSTRAINT "bahrain_lawyer_push_subscriptions_advocate_id_bahrain_lawyers_id_fk" FOREIGN KEY ("advocate_id") REFERENCES "public"."bahrain_lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_legal_cases" ADD CONSTRAINT "bahrain_legal_cases_category_id_bahrain_legal_case_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."bahrain_legal_case_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_payment_allocations" ADD CONSTRAINT "bahrain_payment_allocations_booking_request_id_bahrain_booking_requests_id_fk" FOREIGN KEY ("booking_request_id") REFERENCES "public"."bahrain_booking_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_payment_allocations" ADD CONSTRAINT "bahrain_payment_allocations_provider_id_bahrain_lawyers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."bahrain_lawyers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_payment_allocations" ADD CONSTRAINT "bahrain_payment_allocations_commission_rate_id_bahrain_provider_commission_rates_id_fk" FOREIGN KEY ("commission_rate_id") REFERENCES "public"."bahrain_provider_commission_rates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_provider_commission_rates" ADD CONSTRAINT "bahrain_provider_commission_rates_provider_id_bahrain_lawyers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."bahrain_lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahrain_tap_retailer_onboarding" ADD CONSTRAINT "bahrain_tap_retailer_onboarding_lawyer_id_bahrain_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."bahrain_lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advocate_shifts_advocate_idx" ON "bahrain_advocate_shifts" USING btree ("advocate_id");--> statement-breakpoint
CREATE INDEX "bahrain_advocate_shifts_country_code_idx" ON "bahrain_advocate_shifts" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "booking_requests_assigned_to_email_idx" ON "bahrain_booking_requests" USING btree ("assigned_to_email");--> statement-breakpoint
CREATE INDEX "booking_requests_payment_status_idx" ON "bahrain_booking_requests" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "booking_requests_admin_status_idx" ON "bahrain_booking_requests" USING btree ("admin_status");--> statement-breakpoint
CREATE INDEX "booking_requests_tap_charge_id_idx" ON "bahrain_booking_requests" USING btree ("tap_charge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bahrain_booking_mobile_payment_idempotency_uidx" ON "bahrain_booking_requests" USING btree ("mobile_payment_idempotency_key") WHERE "bahrain_booking_requests"."mobile_payment_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "bahrain_booking_mobile_payment_case_idx" ON "bahrain_booking_requests" USING btree ("mobile_payment_case_id") WHERE "bahrain_booking_requests"."mobile_payment_case_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "booking_requests_selected_lawyer_id_idx" ON "bahrain_booking_requests" USING btree ("selected_lawyer_id");--> statement-breakpoint
CREATE INDEX "booking_requests_legal_case_idx" ON "bahrain_booking_requests" USING btree ("legal_case_id");--> statement-breakpoint
CREATE INDEX "booking_requests_created_at_idx" ON "bahrain_booking_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bahrain_booking_requests_country_code_idx" ON "bahrain_booking_requests" USING btree ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_reviews_booking_request_unique_idx" ON "bahrain_booking_reviews" USING btree ("booking_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_reviews_token_hash_unique_idx" ON "bahrain_booking_reviews" USING btree ("review_token_hash");--> statement-breakpoint
CREATE INDEX "booking_reviews_lawyer_idx" ON "bahrain_booking_reviews" USING btree ("lawyer_id");--> statement-breakpoint
CREATE INDEX "booking_reviews_status_idx" ON "bahrain_booking_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "booking_reviews_submitted_at_idx" ON "bahrain_booking_reviews" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "booking_reviews_lawyer_submitted_idx" ON "bahrain_booking_reviews" USING btree ("lawyer_id","submitted_at");--> statement-breakpoint
CREATE INDEX "bahrain_booking_reviews_country_code_idx" ON "bahrain_booking_reviews" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "consent_log_id_number_idx" ON "bahrain_consent_log" USING btree ("id_number");--> statement-breakpoint
CREATE INDEX "consent_log_role_idx" ON "bahrain_consent_log" USING btree ("role");--> statement-breakpoint
CREATE INDEX "bahrain_consent_log_country_code_idx" ON "bahrain_consent_log" USING btree ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "bahrain_consultation_methods_code_unique_idx" ON "bahrain_consultation_methods" USING btree ("code");--> statement-breakpoint
CREATE INDEX "bahrain_consultation_methods_active_sort_idx" ON "bahrain_consultation_methods" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "bahrain_consultation_methods_country_code_idx" ON "bahrain_consultation_methods" USING btree ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "countries_code_unique_idx" ON "countries" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "countries_table_prefix_unique_idx" ON "countries" USING btree ("table_prefix");--> statement-breakpoint
CREATE INDEX "countries_active_idx" ON "countries" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "bahrain_emergency_case_types_slug_unique_idx" ON "bahrain_emergency_case_types" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "bahrain_emergency_case_types_active_sort_idx" ON "bahrain_emergency_case_types" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "bahrain_emergency_case_types_country_code_idx" ON "bahrain_emergency_case_types" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "emergency_requests_case_ref_idx" ON "bahrain_emergency_requests" USING btree ("case_ref");--> statement-breakpoint
CREATE INDEX "emergency_requests_status_idx" ON "bahrain_emergency_requests" USING btree ("service_status");--> statement-breakpoint
CREATE INDEX "emergency_requests_created_idx" ON "bahrain_emergency_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bahrain_emergency_requests_country_code_idx" ON "bahrain_emergency_requests" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "lawyer_agreements_reference_idx" ON "bahrain_lawyer_agreements" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "lawyer_agreements_status_idx" ON "bahrain_lawyer_agreements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lawyer_agreements_created_idx" ON "bahrain_lawyer_agreements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bahrain_lawyer_agreements_country_code_idx" ON "bahrain_lawyer_agreements" USING btree ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "lawyer_legal_cases_lawyer_case_unique_idx" ON "bahrain_lawyer_legal_cases" USING btree ("lawyer_id","legal_case_id");--> statement-breakpoint
CREATE INDEX "lawyer_legal_cases_lawyer_idx" ON "bahrain_lawyer_legal_cases" USING btree ("lawyer_id");--> statement-breakpoint
CREATE INDEX "lawyer_legal_cases_case_idx" ON "bahrain_lawyer_legal_cases" USING btree ("legal_case_id");--> statement-breakpoint
CREATE INDEX "bahrain_lawyer_legal_cases_country_code_idx" ON "bahrain_lawyer_legal_cases" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "lawyer_push_advocate_idx" ON "bahrain_lawyer_push_subscriptions" USING btree ("advocate_id");--> statement-breakpoint
CREATE INDEX "bahrain_lawyer_push_subscriptions_country_code_idx" ON "bahrain_lawyer_push_subscriptions" USING btree ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_case_categories_key_unique_idx" ON "bahrain_legal_case_categories" USING btree ("key");--> statement-breakpoint
CREATE INDEX "legal_case_categories_active_idx" ON "bahrain_legal_case_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "legal_case_categories_sort_idx" ON "bahrain_legal_case_categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "bahrain_legal_case_categories_country_code_idx" ON "bahrain_legal_case_categories" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "legal_case_guidance_active_idx" ON "legal_case_guidance" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_cases_key_unique_idx" ON "bahrain_legal_cases" USING btree ("key");--> statement-breakpoint
CREATE INDEX "legal_cases_category_idx" ON "bahrain_legal_cases" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "legal_cases_active_idx" ON "bahrain_legal_cases" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "legal_cases_sort_idx" ON "bahrain_legal_cases" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "bahrain_legal_cases_country_code_idx" ON "bahrain_legal_cases" USING btree ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_allocations_booking_unique_idx" ON "bahrain_payment_allocations" USING btree ("booking_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_allocations_tap_charge_unique_idx" ON "bahrain_payment_allocations" USING btree ("tap_charge_id");--> statement-breakpoint
CREATE INDEX "payment_allocations_provider_idx" ON "bahrain_payment_allocations" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "payment_allocations_payout_status_idx" ON "bahrain_payment_allocations" USING btree ("payout_status");--> statement-breakpoint
CREATE INDEX "payment_allocations_captured_at_idx" ON "bahrain_payment_allocations" USING btree ("captured_at");--> statement-breakpoint
CREATE INDEX "payment_allocations_country_idx" ON "bahrain_payment_allocations" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "payment_allocations_split_mode_idx" ON "bahrain_payment_allocations" USING btree ("split_mode");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_commission_rates_provider_start_unique_idx" ON "bahrain_provider_commission_rates" USING btree ("provider_id","effective_from");--> statement-breakpoint
CREATE INDEX "provider_commission_rates_provider_idx" ON "bahrain_provider_commission_rates" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "provider_commission_rates_active_idx" ON "bahrain_provider_commission_rates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "provider_commission_rates_effective_idx" ON "bahrain_provider_commission_rates" USING btree ("effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "provider_commission_rates_country_idx" ON "bahrain_provider_commission_rates" USING btree ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "tap_retailer_onboarding_lawyer_env_unique_idx" ON "bahrain_tap_retailer_onboarding" USING btree ("lawyer_id","environment");--> statement-breakpoint
CREATE UNIQUE INDEX "tap_retailer_onboarding_lead_env_unique_idx" ON "bahrain_tap_retailer_onboarding" USING btree ("environment","lead_id") WHERE "bahrain_tap_retailer_onboarding"."lead_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tap_retailer_onboarding_retailer_env_unique_idx" ON "bahrain_tap_retailer_onboarding" USING btree ("environment","retailer_id") WHERE "bahrain_tap_retailer_onboarding"."retailer_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tap_retailer_onboarding_destination_env_unique_idx" ON "bahrain_tap_retailer_onboarding" USING btree ("environment","destination_id") WHERE "bahrain_tap_retailer_onboarding"."destination_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "tap_retailer_onboarding_stage_idx" ON "bahrain_tap_retailer_onboarding" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "tap_retailer_onboarding_retailer_idx" ON "bahrain_tap_retailer_onboarding" USING btree ("retailer_id");--> statement-breakpoint
ALTER TABLE "bahrain_lawyers" ADD CONSTRAINT "bahrain_lawyers_consent_id_bahrain_consent_log_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."bahrain_consent_log"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bahrain_lawyers_country_code_idx" ON "bahrain_lawyers" USING btree ("country_code");