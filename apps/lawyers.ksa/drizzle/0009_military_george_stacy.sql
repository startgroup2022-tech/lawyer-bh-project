CREATE TABLE "provider_join_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notary_id" text,
	"subscription_type" text NOT NULL,
	"full_name_ar" text NOT NULL,
	"full_name_en" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"language" text NOT NULL,
	"license_number" text,
	"license_file_name" text,
	"license_file_mime_type" text,
	"license_file_base64" text,
	"signature_data_url" text NOT NULL,
	"agreement_accepted" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"locale" varchar(5) DEFAULT 'ar' NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "provider_join_applications_notary_id_idx" ON "provider_join_applications" USING btree ("notary_id");--> statement-breakpoint
CREATE INDEX "provider_join_applications_email_idx" ON "provider_join_applications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "provider_join_applications_phone_idx" ON "provider_join_applications" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "provider_join_applications_status_idx" ON "provider_join_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "provider_join_applications_created_idx" ON "provider_join_applications" USING btree ("created_at");