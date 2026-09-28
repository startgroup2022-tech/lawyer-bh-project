CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.bahrain_provider_commission_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  provider_id uuid NOT NULL REFERENCES public.bahrain_lawyers(id) ON DELETE CASCADE,
  platform_percentage numeric(5,2) NOT NULL,
  provider_percentage numeric(5,2) NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_commission_rates_provider_start_unique_idx
  ON public.bahrain_provider_commission_rates (provider_id, effective_from);
CREATE INDEX IF NOT EXISTS provider_commission_rates_provider_idx
  ON public.bahrain_provider_commission_rates (provider_id);
CREATE INDEX IF NOT EXISTS provider_commission_rates_active_idx
  ON public.bahrain_provider_commission_rates (is_active);
CREATE INDEX IF NOT EXISTS provider_commission_rates_effective_idx
  ON public.bahrain_provider_commission_rates (effective_from, effective_to);
CREATE INDEX IF NOT EXISTS provider_commission_rates_country_idx
  ON public.bahrain_provider_commission_rates (country_code);

CREATE TABLE IF NOT EXISTS public.bahrain_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  booking_request_id uuid NOT NULL REFERENCES public.bahrain_booking_requests(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.bahrain_lawyers(id) ON DELETE SET NULL,
  commission_rate_id uuid REFERENCES public.bahrain_provider_commission_rates(id) ON DELETE SET NULL,
  tap_charge_id text NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'BHD',
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
  CONSTRAINT payment_allocations_split_mode_check
    CHECK (split_mode IN ('legacy', 'platform_only', 'instant', 'delayed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_allocations_booking_unique_idx
  ON public.bahrain_payment_allocations (booking_request_id);
CREATE UNIQUE INDEX IF NOT EXISTS payment_allocations_tap_charge_unique_idx
  ON public.bahrain_payment_allocations (tap_charge_id);
CREATE INDEX IF NOT EXISTS payment_allocations_provider_idx
  ON public.bahrain_payment_allocations (provider_id);
CREATE INDEX IF NOT EXISTS payment_allocations_payout_status_idx
  ON public.bahrain_payment_allocations (payout_status);
CREATE INDEX IF NOT EXISTS payment_allocations_captured_at_idx
  ON public.bahrain_payment_allocations (captured_at);
CREATE INDEX IF NOT EXISTS payment_allocations_country_idx
  ON public.bahrain_payment_allocations (country_code);

CREATE TABLE IF NOT EXISTS public.bahrain_tap_retailer_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL,
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
  CONSTRAINT tap_retailer_onboarding_lawyer_id_bahrain_lawyers_id_fk
    FOREIGN KEY (lawyer_id)
    REFERENCES public.bahrain_lawyers(id)
    ON DELETE CASCADE,
  CONSTRAINT tap_retailer_onboarding_environment_check
    CHECK (environment IN ('test', 'live')),
  CONSTRAINT tap_retailer_onboarding_stage_check
    CHECK (
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
  CONSTRAINT tap_retailer_onboarding_attempt_count_check
    CHECK (attempt_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS tap_retailer_onboarding_lawyer_env_unique_idx
  ON public.bahrain_tap_retailer_onboarding (lawyer_id, environment);

CREATE UNIQUE INDEX IF NOT EXISTS tap_retailer_onboarding_lead_env_unique_idx
  ON public.bahrain_tap_retailer_onboarding (environment, lead_id)
  WHERE lead_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tap_retailer_onboarding_retailer_env_unique_idx
  ON public.bahrain_tap_retailer_onboarding (environment, retailer_id)
  WHERE retailer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tap_retailer_onboarding_destination_env_unique_idx
  ON public.bahrain_tap_retailer_onboarding (environment, destination_id)
  WHERE destination_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tap_retailer_onboarding_stage_idx
  ON public.bahrain_tap_retailer_onboarding (stage);

CREATE INDEX IF NOT EXISTS tap_retailer_onboarding_retailer_idx
  ON public.bahrain_tap_retailer_onboarding (retailer_id);

ALTER TABLE public.bahrain_payment_allocations
  ADD COLUMN IF NOT EXISTS split_mode text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS destination_id text,
  ADD COLUMN IF NOT EXISTS split_executed_at timestamptz,
  ADD COLUMN IF NOT EXISTS split_error text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bahrain_payment_allocations'::regclass
      AND conname = 'payment_allocations_split_mode_check'
  ) THEN
    ALTER TABLE public.bahrain_payment_allocations
      ADD CONSTRAINT payment_allocations_split_mode_check
      CHECK (split_mode IN ('legacy', 'platform_only', 'instant', 'delayed'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS payment_allocations_split_mode_idx
  ON public.bahrain_payment_allocations (split_mode);
