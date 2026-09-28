ALTER TABLE "emergency_requests" ADD COLUMN "internal_notes" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "emergency_requests" ADD COLUMN "cancellation_reason" text;