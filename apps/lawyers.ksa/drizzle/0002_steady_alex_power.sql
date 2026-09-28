CREATE TABLE "lawyer_push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advocate_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lawyer_push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "lawyer_push_subscriptions" ADD CONSTRAINT "lawyer_push_subscriptions_advocate_id_bahrain_lawyers_id_fk" FOREIGN KEY ("advocate_id") REFERENCES "public"."bahrain_lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lawyer_push_advocate_idx" ON "lawyer_push_subscriptions" USING btree ("advocate_id");