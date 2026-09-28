ALTER TABLE public.bahrain_booking_requests
  ADD COLUMN IF NOT EXISTS mobile_payment_idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS mobile_payment_case_id text;

CREATE UNIQUE INDEX IF NOT EXISTS bahrain_booking_mobile_payment_idempotency_uidx
  ON public.bahrain_booking_requests (mobile_payment_idempotency_key)
  WHERE mobile_payment_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS bahrain_booking_mobile_payment_case_idx
  ON public.bahrain_booking_requests (mobile_payment_case_id)
  WHERE mobile_payment_case_id IS NOT NULL;
