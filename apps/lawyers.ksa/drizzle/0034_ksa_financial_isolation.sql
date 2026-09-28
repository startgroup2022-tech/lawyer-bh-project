-- Saudi-only financial structures for Lawyers KSA.
-- This migration is additive: Bahrain rows and tables are not rewritten.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SELECT public.provision_country_tables('SA', 'saudi');
SELECT public.provision_country_emergency_case_types('SA', 'saudi');
SELECT public.provision_country_consultation_methods('SA', 'saudi');

ALTER TABLE public.saudi_booking_requests
  ADD COLUMN IF NOT EXISTS currency_code varchar(3) NOT NULL DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS amount numeric(10,3),
  ADD COLUMN IF NOT EXISTS original_amount numeric(10,3),
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,3),
  ADD COLUMN IF NOT EXISTS final_amount numeric(10,3);

UPDATE public.saudi_booking_requests
SET
  currency_code = 'SAR',
  amount = COALESCE(amount, amount_bd),
  original_amount = COALESCE(original_amount, original_amount_bd, amount_bd),
  discount_amount = COALESCE(discount_amount, discount_amount_bd, 0),
  final_amount = COALESCE(final_amount, final_amount_bd, amount_bd)
WHERE
  currency_code IS DISTINCT FROM 'SAR'
  OR amount IS NULL
  OR original_amount IS NULL
  OR discount_amount IS NULL
  OR final_amount IS NULL;

ALTER TABLE public.saudi_booking_requests
  ALTER COLUMN currency_code SET DEFAULT 'SAR',
  ALTER COLUMN currency_code SET NOT NULL;

ALTER TABLE public.saudi_emergency_requests
  ADD COLUMN IF NOT EXISTS currency_code varchar(3) NOT NULL DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS base_fee numeric(10,3),
  ADD COLUMN IF NOT EXISTS refund_amount numeric(10,3);

UPDATE public.saudi_emergency_requests
SET
  currency_code = 'SAR',
  base_fee = COALESCE(base_fee, base_fee_bhd),
  refund_amount = COALESCE(refund_amount, refund_amount_bhd)
WHERE
  currency_code IS DISTINCT FROM 'SAR'
  OR base_fee IS NULL
  OR (refund_amount IS NULL AND refund_amount_bhd IS NOT NULL);

ALTER TABLE public.saudi_emergency_requests
  ALTER COLUMN currency_code SET DEFAULT 'SAR',
  ALTER COLUMN currency_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.saudi_booking_requests'::regclass
      AND conname = 'saudi_booking_currency_sar_check'
  ) THEN
    ALTER TABLE public.saudi_booking_requests
      ADD CONSTRAINT saudi_booking_currency_sar_check
      CHECK (currency_code = 'SAR');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.saudi_emergency_requests'::regclass
      AND conname = 'saudi_emergency_currency_sar_check'
  ) THEN
    ALTER TABLE public.saudi_emergency_requests
      ADD CONSTRAINT saudi_emergency_currency_sar_check
      CHECK (currency_code = 'SAR');
  END IF;
END;
$$;

ALTER TABLE public.saudi_emergency_case_types
  ALTER COLUMN currency_code SET DEFAULT 'SAR';
UPDATE public.saudi_emergency_case_types SET currency_code = 'SAR';

ALTER TABLE public.saudi_consultation_methods
  ALTER COLUMN currency_code SET DEFAULT 'SAR';
UPDATE public.saudi_consultation_methods SET currency_code = 'SAR';

CREATE TABLE IF NOT EXISTS public.saudi_provider_commission_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2) NOT NULL DEFAULT 'SA',
  provider_id uuid NOT NULL REFERENCES public.saudi_lawyers(id) ON DELETE CASCADE,
  platform_percentage numeric(5,2) NOT NULL,
  provider_percentage numeric(5,2) NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saudi_commission_country_check CHECK (country_code = 'SA')
);

CREATE UNIQUE INDEX IF NOT EXISTS saudi_commission_provider_start_uidx
  ON public.saudi_provider_commission_rates (provider_id, effective_from);
CREATE INDEX IF NOT EXISTS saudi_commission_provider_idx
  ON public.saudi_provider_commission_rates (provider_id);
CREATE INDEX IF NOT EXISTS saudi_commission_active_idx
  ON public.saudi_provider_commission_rates (is_active);
CREATE INDEX IF NOT EXISTS saudi_commission_effective_idx
  ON public.saudi_provider_commission_rates (effective_from, effective_to);

CREATE TABLE IF NOT EXISTS public.saudi_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2) NOT NULL DEFAULT 'SA',
  booking_request_id uuid NOT NULL REFERENCES public.saudi_booking_requests(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.saudi_lawyers(id) ON DELETE SET NULL,
  commission_rate_id uuid REFERENCES public.saudi_provider_commission_rates(id) ON DELETE SET NULL,
  tap_charge_id text NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'SAR',
  gross_amount numeric(12,3) NOT NULL,
  platform_percentage numeric(5,2) NOT NULL,
  provider_percentage numeric(5,2) NOT NULL,
  platform_amount numeric(12,3) NOT NULL,
  provider_amount numeric(12,3) NOT NULL,
  gateway_fee_amount numeric(12,3) NOT NULL DEFAULT 0.000,
  split_mode text NOT NULL DEFAULT 'legacy',
  destination_id text,
  split_executed_at timestamptz,
  split_error text,
  allocation_status text NOT NULL DEFAULT 'calculated',
  payout_status text NOT NULL DEFAULT 'pending',
  captured_at timestamptz NOT NULL DEFAULT now(),
  paid_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saudi_allocation_country_check CHECK (country_code = 'SA'),
  CONSTRAINT saudi_allocation_currency_check CHECK (currency_code = 'SAR'),
  CONSTRAINT saudi_allocation_split_mode_check
    CHECK (split_mode IN ('legacy', 'platform_only', 'instant', 'delayed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS saudi_allocation_booking_uidx
  ON public.saudi_payment_allocations (booking_request_id);
CREATE UNIQUE INDEX IF NOT EXISTS saudi_allocation_tap_charge_uidx
  ON public.saudi_payment_allocations (tap_charge_id);
CREATE INDEX IF NOT EXISTS saudi_allocation_provider_idx
  ON public.saudi_payment_allocations (provider_id);
CREATE INDEX IF NOT EXISTS saudi_allocation_payout_idx
  ON public.saudi_payment_allocations (payout_status);
CREATE INDEX IF NOT EXISTS saudi_allocation_captured_idx
  ON public.saudi_payment_allocations (captured_at);
CREATE INDEX IF NOT EXISTS saudi_allocation_split_mode_idx
  ON public.saudi_payment_allocations (split_mode);

CREATE TABLE IF NOT EXISTS public.saudi_tap_retailer_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.saudi_lawyers(id) ON DELETE CASCADE,
  environment text NOT NULL,
  marketplace_mid text NOT NULL,
  stage text NOT NULL DEFAULT 'pending_admin',
  commercial_registration_file_id text,
  personal_id_file_id text,
  iban_certificate_file_id text,
  lead_id text,
  retailer_id text,
  destination_id text,
  kyc_status text NOT NULL DEFAULT 'pending',
  payout_enabled boolean NOT NULL DEFAULT false,
  attempt_count integer NOT NULL DEFAULT 0,
  last_completed_stage text,
  last_error_code text,
  last_error_message text,
  last_attempt_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saudi_tap_environment_check CHECK (environment IN ('test', 'live')),
  CONSTRAINT saudi_tap_stage_check CHECK (
    stage IN (
      'pending_admin',
      'tap_uploading_files',
      'tap_creating_lead',
      'tap_creating_retailer',
      'tap_kyc_pending',
      'tap_failed',
      'active'
    )
  ),
  CONSTRAINT saudi_tap_attempt_count_check CHECK (attempt_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS saudi_tap_lawyer_env_uidx
  ON public.saudi_tap_retailer_onboarding (lawyer_id, environment);
CREATE UNIQUE INDEX IF NOT EXISTS saudi_tap_lead_env_uidx
  ON public.saudi_tap_retailer_onboarding (environment, lead_id)
  WHERE lead_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS saudi_tap_retailer_env_uidx
  ON public.saudi_tap_retailer_onboarding (environment, retailer_id)
  WHERE retailer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS saudi_tap_destination_env_uidx
  ON public.saudi_tap_retailer_onboarding (environment, destination_id)
  WHERE destination_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS saudi_tap_stage_idx
  ON public.saudi_tap_retailer_onboarding (stage);
CREATE INDEX IF NOT EXISTS saudi_tap_retailer_idx
  ON public.saudi_tap_retailer_onboarding (retailer_id);
