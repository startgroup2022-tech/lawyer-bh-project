CREATE TABLE IF NOT EXISTS "bahrain_mobile_push_installations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fcm_token" text NOT NULL,
  "lawyer_id" uuid,
  "platform" varchar(16) DEFAULT 'ios' NOT NULL,
  "locale" varchar(5) DEFAULT 'ar' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bahrain_mobile_push_installations_token_uidx"
  ON "bahrain_mobile_push_installations" USING btree ("fcm_token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bahrain_mobile_push_installations_lawyer_idx"
  ON "bahrain_mobile_push_installations" USING btree ("lawyer_id");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bahrain_mobile_push_installations"
    ADD CONSTRAINT "bahrain_mobile_push_installations_lawyer_id_bahrain_lawyers_id_fk"
    FOREIGN KEY ("lawyer_id") REFERENCES "public"."bahrain_lawyers"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bahrain_mobile_push_request_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "installation_id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bahrain_mobile_push_request_subscription_uidx"
  ON "bahrain_mobile_push_request_subscriptions" USING btree ("installation_id", "request_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bahrain_mobile_push_request_subscription_request_idx"
  ON "bahrain_mobile_push_request_subscriptions" USING btree ("request_id");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bahrain_mobile_push_request_subscriptions"
    ADD CONSTRAINT "bahrain_mobile_push_request_subscriptions_installation_id_fk"
    FOREIGN KEY ("installation_id") REFERENCES "public"."bahrain_mobile_push_installations"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bahrain_mobile_push_request_subscriptions"
    ADD CONSTRAINT "bahrain_mobile_push_request_subscriptions_request_id_fk"
    FOREIGN KEY ("request_id") REFERENCES "public"."bahrain_emergency_requests"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
