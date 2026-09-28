DO $$ BEGIN
  CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.discount_redemption_status AS ENUM ('reserved', 'redeemed', 'released', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(32) NOT NULL,
  discount_type public.discount_type NOT NULL,
  discount_value numeric(12,3) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  total_usage_limit integer,
  per_user_usage_limit integer,
  created_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discount_codes_value_check CHECK (discount_value > 0 AND (discount_type <> 'percentage' OR discount_value <= 100)),
  CONSTRAINT discount_codes_window_check CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT discount_codes_total_limit_check CHECK (total_usage_limit IS NULL OR total_usage_limit > 0),
  CONSTRAINT discount_codes_user_limit_check CHECK (per_user_usage_limit IS NULL OR per_user_usage_limit > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS discount_codes_code_unique_idx ON public.discount_codes(code);
CREATE INDEX IF NOT EXISTS discount_codes_active_window_idx ON public.discount_codes(is_active, starts_at, ends_at);

ALTER TABLE public.bahrain_booking_requests
  ADD COLUMN IF NOT EXISTS discount_code_id uuid REFERENCES public.discount_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_code varchar(32),
  ADD COLUMN IF NOT EXISTS original_amount_bd numeric(10,3),
  ADD COLUMN IF NOT EXISTS discount_amount_bd numeric(10,3),
  ADD COLUMN IF NOT EXISTS final_amount_bd numeric(10,3);

CREATE TABLE IF NOT EXISTS public.discount_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE RESTRICT,
  booking_request_id uuid REFERENCES public.bahrain_booking_requests(id) ON DELETE SET NULL,
  user_key varchar(254) NOT NULL,
  flow varchar(32) NOT NULL,
  original_amount_bd numeric(10,3) NOT NULL,
  discount_amount_bd numeric(10,3) NOT NULL,
  final_amount_bd numeric(10,3) NOT NULL,
  status public.discount_redemption_status NOT NULL DEFAULT 'reserved',
  tap_charge_id text,
  reserved_until timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS discount_redemptions_booking_code_unique_idx ON public.discount_redemptions(booking_request_id, discount_code_id);
CREATE INDEX IF NOT EXISTS discount_redemptions_code_status_idx ON public.discount_redemptions(discount_code_id, status);
CREATE INDEX IF NOT EXISTS discount_redemptions_code_user_status_idx ON public.discount_redemptions(discount_code_id, user_key, status);
CREATE UNIQUE INDEX IF NOT EXISTS discount_redemptions_tap_charge_unique_idx ON public.discount_redemptions(tap_charge_id) WHERE tap_charge_id IS NOT NULL;
