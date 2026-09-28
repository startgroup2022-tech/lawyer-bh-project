ALTER TABLE public.bahrain_emergency_requests
  ADD COLUMN IF NOT EXISTS mobile_payment_idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS mobile_payment_case_id text,
  ADD COLUMN IF NOT EXISTS tap_charge_id text,
  ADD COLUMN IF NOT EXISTS tap_status text,
  ADD COLUMN IF NOT EXISTS tap_payload jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS bahrain_emergency_mobile_payment_idempotency_uidx
  ON public.bahrain_emergency_requests (mobile_payment_idempotency_key)
  WHERE mobile_payment_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS bahrain_emergency_mobile_payment_case_idx
  ON public.bahrain_emergency_requests (mobile_payment_case_id)
  WHERE mobile_payment_case_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bahrain_emergency_tap_charge_uidx
  ON public.bahrain_emergency_requests (tap_charge_id)
  WHERE tap_charge_id IS NOT NULL;

ALTER TABLE public.bahrain_payment_allocations
  ALTER COLUMN booking_request_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS emergency_request_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.bahrain_payment_allocations'::regclass
      AND conname = 'bahrain_payment_allocations_emergency_request_id_fk'
  ) THEN
    ALTER TABLE public.bahrain_payment_allocations
      ADD CONSTRAINT bahrain_payment_allocations_emergency_request_id_fk
      FOREIGN KEY (emergency_request_id)
      REFERENCES public.bahrain_emergency_requests(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.bahrain_payment_allocations'::regclass
      AND conname = 'payment_allocations_exactly_one_request_check'
  ) THEN
    ALTER TABLE public.bahrain_payment_allocations
      ADD CONSTRAINT payment_allocations_exactly_one_request_check
      CHECK (
        ((booking_request_id IS NOT NULL)::int +
         (emergency_request_id IS NOT NULL)::int) = 1
      );
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS payment_allocations_emergency_unique_idx
  ON public.bahrain_payment_allocations (emergency_request_id)
  WHERE emergency_request_id IS NOT NULL;
