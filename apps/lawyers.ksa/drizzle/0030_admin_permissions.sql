ALTER TABLE "admin_users"
  ADD COLUMN IF NOT EXISTS "permissions" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "created_by_admin_id" uuid,
  ADD COLUMN IF NOT EXISTS "permissions_updated_by_admin_id" uuid,
  ADD COLUMN IF NOT EXISTS "permissions_updated_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "admin_users"
SET "permissions" = CASE
  WHEN "role" = 'admin' THEN '{"view_dashboard":true,"manage_discounts":true,"manage_approvals":true,"manage_requests":true,"manage_finance":true,"manage_reviews":true,"manage_lawyers":true}'::jsonb
  WHEN "role" = 'reviewer' THEN '{"view_dashboard":true,"manage_approvals":true,"manage_reviews":true,"manage_lawyers":true}'::jsonb
  ELSE '{}'::jsonb
END
WHERE "permissions" = '{}'::jsonb;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_created_by_admin_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_permissions_updated_by_admin_id_fk" FOREIGN KEY ("permissions_updated_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_users_created_by_idx" ON "admin_users" ("created_by_admin_id");
