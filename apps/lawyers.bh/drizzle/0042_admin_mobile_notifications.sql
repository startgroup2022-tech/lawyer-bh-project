ALTER TABLE public.bahrain_mobile_push_installations
  ADD COLUMN IF NOT EXISTS audience_role text;
--> statement-breakpoint
UPDATE public.bahrain_mobile_push_installations
SET audience_role = CASE WHEN lawyer_id IS NULL THEN 'client' ELSE 'lawyer' END
WHERE audience_role IS NULL;
--> statement-breakpoint
ALTER TABLE public.bahrain_mobile_push_installations
  ALTER COLUMN audience_role SET DEFAULT 'client',
  ALTER COLUMN audience_role SET NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bahrain_mobile_push_installations_audience_role_check'
  ) THEN
    ALTER TABLE public.bahrain_mobile_push_installations
      ADD CONSTRAINT bahrain_mobile_push_installations_audience_role_check
      CHECK (audience_role IN ('client', 'lawyer'));
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS bahrain_mobile_push_installations_audience_role_idx
  ON public.bahrain_mobile_push_installations (audience_role);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.bahrain_admin_mobile_notification_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin_users(id),
  audience text NOT NULL CHECK (audience IN ('clients', 'active_lawyers', 'pending_lawyers', 'all_lawyers', 'everyone')),
  title_ar varchar(100) NOT NULL,
  body_ar varchar(500) NOT NULL,
  title_en varchar(100) NOT NULL,
  body_en varchar(500) NOT NULL,
  idempotency_key uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('sending', 'completed', 'failed')),
  targeted_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  pruned_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS bahrain_admin_mobile_notification_sends_created_idx
  ON public.bahrain_admin_mobile_notification_sends (created_at DESC);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS bahrain_admin_mobile_notification_sends_idempotency_uidx
  ON public.bahrain_admin_mobile_notification_sends (idempotency_key);
