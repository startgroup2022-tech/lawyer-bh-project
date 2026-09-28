CREATE TABLE "advocate_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advocate_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_minute_utc" integer NOT NULL,
	"end_minute_utc" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advocate_shifts" ADD CONSTRAINT "advocate_shifts_advocate_id_bahrain_lawyers_id_fk" FOREIGN KEY ("advocate_id") REFERENCES "public"."bahrain_lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advocate_shifts_advocate_idx" ON "advocate_shifts" USING btree ("advocate_id");