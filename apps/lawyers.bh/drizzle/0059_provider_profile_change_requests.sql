CREATE TABLE IF NOT EXISTS public.provider_profile_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.bahrain_lawyers(id) ON DELETE RESTRICT,
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  status varchar(16) NOT NULL DEFAULT 'pending',
  proposed_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_files jsonb NOT NULL DEFAULT '{}'::jsonb,
  rejection_reason text,
  reviewed_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_profile_changes_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  CONSTRAINT provider_profile_changes_review_check
    CHECK (status IN ('pending', 'cancelled') OR (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS provider_profile_changes_provider_idx
  ON public.provider_profile_change_requests (provider_id, created_at);
CREATE INDEX IF NOT EXISTS provider_profile_changes_status_idx
  ON public.provider_profile_change_requests (status, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS provider_profile_changes_one_pending_uidx
  ON public.provider_profile_change_requests (provider_id, country_code)
  WHERE status = 'pending';
