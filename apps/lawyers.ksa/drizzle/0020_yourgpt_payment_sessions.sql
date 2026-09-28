CREATE TABLE IF NOT EXISTS public.yourgpt_payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  lang text NOT NULL DEFAULT 'ar',
  legal_case_id uuid,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text NOT NULL,
  payment_draft jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  last_accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS yourgpt_payment_sessions_expires_at_idx
  ON public.yourgpt_payment_sessions (expires_at);

CREATE INDEX IF NOT EXISTS yourgpt_payment_sessions_legal_case_id_idx
  ON public.yourgpt_payment_sessions (legal_case_id);
