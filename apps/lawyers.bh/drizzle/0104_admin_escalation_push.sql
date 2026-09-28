CREATE TABLE IF NOT EXISTS public.mobile_admin_push_installations (
  fcm_token text PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  session_digest text NOT NULL REFERENCES public.mobile_admin_sessions(token_digest) ON DELETE CASCADE,
  platform varchar(16) NOT NULL,
  locale varchar(5) NOT NULL DEFAULT 'ar',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mobile_admin_push_installations_platform_check CHECK (platform IN ('ios', 'android')),
  CONSTRAINT mobile_admin_push_installations_locale_check CHECK (locale IN ('ar', 'en', 'tr'))
);

CREATE INDEX IF NOT EXISTS mobile_admin_push_installations_admin_idx
  ON public.mobile_admin_push_installations (admin_id);
