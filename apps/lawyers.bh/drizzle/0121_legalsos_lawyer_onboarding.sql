CREATE TABLE IF NOT EXISTS public.legalsos_lawyer_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2) NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  normalized_email text NOT NULL,
  professional_identifier text NOT NULL,
  status text NOT NULL DEFAULT 'email_pending',
  verification_token_hash text,
  verification_token_expires_at timestamptz,
  session_token_hash text,
  session_token_expires_at timestamptz,
  verified_at timestamptz,
  submitted_at timestamptz,
  linked_lawyer_id uuid,
  locale varchar(5) NOT NULL DEFAULT 'ar',
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legalsos_lawyer_onboarding_status_check CHECK (
    status IN ('email_pending', 'profile_incomplete', 'submitted', 'expired', 'cancelled')
  ),
  CONSTRAINT legalsos_lawyer_onboarding_country_check CHECK (
    country_code ~ '^[A-Z]{2}$'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS legalsos_lawyer_onboarding_email_active_uidx
  ON public.legalsos_lawyer_onboarding (country_code, normalized_email)
  WHERE status IN ('email_pending', 'profile_incomplete');

CREATE UNIQUE INDEX IF NOT EXISTS legalsos_lawyer_onboarding_identifier_active_uidx
  ON public.legalsos_lawyer_onboarding (country_code, professional_identifier)
  WHERE status IN ('email_pending', 'profile_incomplete');

CREATE UNIQUE INDEX IF NOT EXISTS legalsos_lawyer_onboarding_verification_token_uidx
  ON public.legalsos_lawyer_onboarding (verification_token_hash)
  WHERE verification_token_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS legalsos_lawyer_onboarding_session_token_uidx
  ON public.legalsos_lawyer_onboarding (session_token_hash)
  WHERE session_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS legalsos_lawyer_onboarding_status_idx
  ON public.legalsos_lawyer_onboarding (status);

CREATE INDEX IF NOT EXISTS legalsos_lawyer_onboarding_linked_lawyer_idx
  ON public.legalsos_lawyer_onboarding (linked_lawyer_id)
  WHERE linked_lawyer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.legalsos_lawyer_onboarding_rate_limits (
  bucket text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legalsos_lawyer_onboarding_rate_limit_count_check CHECK (count > 0)
);

CREATE INDEX IF NOT EXISTS legalsos_lawyer_onboarding_rate_limits_updated_idx
  ON public.legalsos_lawyer_onboarding_rate_limits (updated_at);
