ALTER TABLE public.bahrain_emergency_requests
  ADD COLUMN IF NOT EXISTS admin_escalated_at timestamptz;

CREATE INDEX IF NOT EXISTS bahrain_emergency_requests_offer_expiry_idx
  ON public.bahrain_emergency_requests (lawyer_response_deadline)
  WHERE service_status = 'pending'
    AND assigned_lawyer_id IS NULL
    AND customer_approved_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS bahrain_emergency_requests_admin_escalation_idx
  ON public.bahrain_emergency_requests (admin_escalated_at)
  WHERE admin_escalated_at IS NOT NULL;
