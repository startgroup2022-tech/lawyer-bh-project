ALTER TABLE "emergency_requests" ADD COLUMN "settled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "emergency_requests" ADD COLUMN "settled_by" text;