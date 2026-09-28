CREATE TABLE IF NOT EXISTS public.mobile_admin_escalation_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.bahrain_emergency_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  CONSTRAINT mobile_admin_escalation_outbox_status_check CHECK (status IN ('pending', 'leased', 'delivered', 'failed')),
  CONSTRAINT mobile_admin_escalation_outbox_event_check CHECK (event_type = 'admin_request_escalated'),
  CONSTRAINT mobile_admin_escalation_outbox_unique UNIQUE (request_id, event_type)
);

CREATE INDEX IF NOT EXISTS mobile_admin_escalation_outbox_due_idx
  ON public.mobile_admin_escalation_outbox (next_attempt_at)
  WHERE status IN ('pending', 'leased');
