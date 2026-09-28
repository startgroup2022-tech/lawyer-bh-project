CREATE TABLE IF NOT EXISTS "booking_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_reviews_booking_request_id_booking_requests_id_fk'
  ) THEN
    ALTER TABLE "booking_reviews"
      ADD CONSTRAINT "booking_reviews_booking_request_id_booking_requests_id_fk"
      FOREIGN KEY ("booking_request_id")
      REFERENCES "public"."booking_requests"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_reviews_lawyer_id_bahrain_lawyers_id_fk'
  ) THEN
    ALTER TABLE "booking_reviews"
      ADD CONSTRAINT "booking_reviews_lawyer_id_bahrain_lawyers_id_fk"
      FOREIGN KEY ("lawyer_id")
      REFERENCES "public"."bahrain_lawyers"("id")
      ON DELETE set null
      ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "booking_reviews_booking_request_unique_idx"
  ON "booking_reviews" USING btree ("booking_request_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "booking_reviews_token_hash_unique_idx"
  ON "booking_reviews" USING btree ("review_token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_reviews_lawyer_idx"
  ON "booking_reviews" USING btree ("lawyer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_reviews_status_idx"
  ON "booking_reviews" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_reviews_submitted_at_idx"
  ON "booking_reviews" USING btree ("submitted_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_reviews_lawyer_submitted_idx"
  ON "booking_reviews" USING btree ("lawyer_id", "submitted_at");
