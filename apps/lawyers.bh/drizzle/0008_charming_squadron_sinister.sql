CREATE TYPE "public"."agreement_status" AS ENUM('draft', 'sent', 'signed', 'void');--> statement-breakpoint
CREATE TYPE "public"."agreement_fee_basis" AS ENUM('judgment', 'settlement', 'enforcement');--> statement-breakpoint
CREATE TYPE "public"."agreement_fee_type" AS ENUM('fixed', 'contingency');--> statement-breakpoint
CREATE TABLE "lawyer_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	CONSTRAINT "lawyer_agreements_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE INDEX "lawyer_agreements_reference_idx" ON "lawyer_agreements" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "lawyer_agreements_status_idx" ON "lawyer_agreements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lawyer_agreements_created_idx" ON "lawyer_agreements" USING btree ("created_at");