CREATE TABLE IF NOT EXISTS public.mobile_admin_sessions (
  token_digest text PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mobile_admin_sessions_expires_at_idx
  ON public.mobile_admin_sessions (expires_at);
