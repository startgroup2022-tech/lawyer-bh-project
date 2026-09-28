CREATE TYPE "public"."refund_status" AS ENUM('none', 'pending', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "emergency_requests" ADD COLUMN "refund_status" "refund_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "emergency_requests" ADD COLUMN "refund_amount_bhd" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "emergency_requests" ADD COLUMN "refund_ref" text;--> statement-breakpoint
ALTER TABLE "emergency_requests" ADD COLUMN "refund_marked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "emergency_requests" ADD COLUMN "refund_marked_by" text;