-- Ensures the YourGPT payment sessions dependency exists,
-- then adds paid WhatsApp consultations and stores service-routing data.
--
-- WhatsApp consultation: 10 BHD / 15 minutes.
-- Non-consultation service requests use a fixed 10 BHD fee in application code.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.yourgpt_payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  lang text NOT NULL DEFAULT 'ar',
  legal_case_id uuid,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  payment_draft jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  last_accessed_at timestamptz,
  service_key varchar(64),
  consultation_method varchar(32),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS yourgpt_payment_sessions_expires_at_idx
  ON public.yourgpt_payment_sessions (expires_at);

CREATE INDEX IF NOT EXISTS yourgpt_payment_sessions_legal_case_id_idx
  ON public.yourgpt_payment_sessions (legal_case_id);

CREATE INDEX IF NOT EXISTS yourgpt_payment_sessions_service_key_idx
  ON public.yourgpt_payment_sessions (service_key);

ALTER TABLE public.bahrain_consultation_methods
  DROP CONSTRAINT IF EXISTS bahrain_consultation_methods_code_check;

ALTER TABLE public.bahrain_consultation_methods
  ADD CONSTRAINT bahrain_consultation_methods_code_check
  CHECK (code IN ('phone', 'whatsapp', 'video', 'office'));

INSERT INTO public.bahrain_consultation_methods (
  country_code,
  code,
  name_ar,
  name_en,
  price,
  currency_code,
  duration_minutes,
  icon_key,
  sort_order,
  is_active
)
VALUES (
  'BH',
  'whatsapp',
  'استشارة عبر واتساب',
  'WhatsApp Consultation',
  10.000,
  'BHD',
  15,
  'message-circle',
  10,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  price = EXCLUDED.price,
  currency_code = EXCLUDED.currency_code,
  duration_minutes = EXCLUDED.duration_minutes,
  icon_key = EXCLUDED.icon_key,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

UPDATE public.bahrain_consultation_methods
SET
  sort_order = CASE code
    WHEN 'whatsapp' THEN 10
    WHEN 'phone' THEN 20
    WHEN 'video' THEN 30
    WHEN 'office' THEN 40
    ELSE sort_order
  END,
  updated_at = now()
WHERE code IN ('phone', 'whatsapp', 'video', 'office');

DO $$
DECLARE
  country_row record;
BEGIN
  FOR country_row IN
    SELECT code, table_prefix
    FROM public.countries
    WHERE tables_provisioned = true
  LOOP
    PERFORM public.provision_country_consultation_methods(
      country_row.code,
      country_row.table_prefix
    );
  END LOOP;
END $$;

ALTER TABLE public.yourgpt_payment_sessions
  ALTER COLUMN customer_email DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS service_key varchar(64),
  ADD COLUMN IF NOT EXISTS consultation_method varchar(32);

CREATE INDEX IF NOT EXISTS yourgpt_payment_sessions_service_key_idx
  ON public.yourgpt_payment_sessions (service_key);