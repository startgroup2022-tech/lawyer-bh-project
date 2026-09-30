CREATE TABLE IF NOT EXISTS public.provider_email_change_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.bahrain_lawyers(id) ON DELETE CASCADE,
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  email text NOT NULL,
  code_digest text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  delivered boolean NOT NULL DEFAULT false,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_email_change_attempts_check CHECK (attempts BETWEEN 0 AND 5)
);
CREATE INDEX IF NOT EXISTS provider_email_change_provider_idx ON public.provider_email_change_challenges(provider_id, created_at DESC);
