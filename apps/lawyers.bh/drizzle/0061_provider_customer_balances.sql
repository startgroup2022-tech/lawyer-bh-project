CREATE TABLE IF NOT EXISTS public.provider_customer_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference varchar(32) NOT NULL UNIQUE,
  provider_id uuid NOT NULL REFERENCES public.bahrain_lawyers(id) ON DELETE RESTRICT,
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  provider_name_ar text NOT NULL,
  provider_name_en text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  description text NOT NULL,
  amount numeric(12,3) NOT NULL CHECK (amount > 0),
  currency_code varchar(3) NOT NULL DEFAULT 'BHD',
  due_date date,
  status varchar(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_payment','paid','expired','cancelled')),
  tap_charge_id text,
  tap_status text,
  payment_url text,
  payment_link_created_at timestamptz,
  payment_link_expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_customer_balances_provider_idx ON public.provider_customer_balances(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS provider_customer_balances_status_idx ON public.provider_customer_balances(status, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS provider_customer_balances_charge_uidx ON public.provider_customer_balances(tap_charge_id) WHERE tap_charge_id IS NOT NULL;

ALTER TABLE public.bahrain_payment_allocations ADD COLUMN IF NOT EXISTS provider_balance_id uuid REFERENCES public.provider_customer_balances(id) ON DELETE RESTRICT;
ALTER TABLE public.bahrain_payment_allocations ADD COLUMN IF NOT EXISTS customer_name_snapshot text;
DROP INDEX IF EXISTS payment_allocations_provider_balance_uidx;
CREATE UNIQUE INDEX payment_allocations_provider_balance_uidx ON public.bahrain_payment_allocations(provider_balance_id) WHERE provider_balance_id IS NOT NULL;
ALTER TABLE public.bahrain_payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_exactly_one_request_check;
ALTER TABLE public.bahrain_payment_allocations ADD CONSTRAINT payment_allocations_exactly_one_request_check CHECK (((booking_request_id IS NOT NULL)::int + (emergency_request_id IS NOT NULL)::int + (provider_balance_id IS NOT NULL)::int) = 1);
