BEGIN;

CREATE TABLE IF NOT EXISTS public.lawyer_withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.bahrain_lawyers(id) ON DELETE RESTRICT,
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  amount numeric(12,3) NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'BHD',
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  paid_at timestamptz,
  settlement_reference text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lawyer_withdrawal_requests_amount_check CHECK (amount > 0),
  CONSTRAINT lawyer_withdrawal_requests_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  CONSTRAINT lawyer_withdrawal_requests_review_check CHECK (
    status = 'pending' OR (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
  ),
  CONSTRAINT lawyer_withdrawal_requests_paid_check CHECK (
    status <> 'paid' OR (paid_at IS NOT NULL AND settlement_reference IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.lawyer_withdrawal_allocations (
  withdrawal_id uuid NOT NULL REFERENCES public.lawyer_withdrawal_requests(id) ON DELETE CASCADE,
  allocation_id uuid NOT NULL REFERENCES public.bahrain_payment_allocations(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (withdrawal_id, allocation_id),
  UNIQUE (allocation_id)
);

CREATE INDEX IF NOT EXISTS lawyer_withdrawal_requests_lawyer_status_idx
  ON public.lawyer_withdrawal_requests (lawyer_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS lawyer_withdrawal_requests_admin_queue_idx
  ON public.lawyer_withdrawal_requests (status, requested_at ASC);

COMMIT;
