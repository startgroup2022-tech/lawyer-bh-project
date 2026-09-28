CREATE TABLE IF NOT EXISTS public.mobile_admin_paid_request_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.bahrain_emergency_requests(id) ON DELETE CASCADE,
  email_status text NOT NULL DEFAULT 'pending',
  email_attempt_count integer NOT NULL DEFAULT 0,
  email_next_attempt_at timestamptz NOT NULL DEFAULT now(),
  email_lease_expires_at timestamptz,
  email_last_error_code text,
  email_delivered_at timestamptz,
  push_status text NOT NULL DEFAULT 'pending',
  push_attempt_count integer NOT NULL DEFAULT 0,
  push_next_attempt_at timestamptz NOT NULL DEFAULT now(),
  push_lease_expires_at timestamptz,
  push_last_error_code text,
  push_delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mobile_admin_paid_request_outbox_request_unique UNIQUE (request_id),
  CONSTRAINT mobile_admin_paid_request_outbox_email_status_check
    CHECK (email_status IN ('pending', 'leased', 'delivered', 'failed')),
  CONSTRAINT mobile_admin_paid_request_outbox_push_status_check
    CHECK (push_status IN ('pending', 'leased', 'delivered', 'failed')),
  CONSTRAINT mobile_admin_paid_request_outbox_email_attempt_check
    CHECK (email_attempt_count >= 0),
  CONSTRAINT mobile_admin_paid_request_outbox_push_attempt_check
    CHECK (push_attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS mobile_admin_paid_request_email_due_idx
  ON public.mobile_admin_paid_request_outbox (email_next_attempt_at)
  WHERE email_status IN ('pending', 'leased');

CREATE INDEX IF NOT EXISTS mobile_admin_paid_request_push_due_idx
  ON public.mobile_admin_paid_request_outbox (push_next_attempt_at)
  WHERE push_status IN ('pending', 'leased');

CREATE OR REPLACE FUNCTION public.enqueue_paid_request_admin_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_status = 'success'
     AND NEW.tap_status = 'CAPTURED'
     AND NEW.service_status <> 'cancelled'
     AND (
       TG_OP = 'INSERT'
       OR OLD.payment_status IS DISTINCT FROM 'success'
       OR OLD.tap_status IS DISTINCT FROM 'CAPTURED'
     ) THEN
    INSERT INTO public.mobile_admin_paid_request_outbox (request_id)
    VALUES (NEW.id)
    ON CONFLICT (request_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bahrain_emergency_paid_admin_notification
  ON public.bahrain_emergency_requests;
CREATE TRIGGER bahrain_emergency_paid_admin_notification
AFTER INSERT OR UPDATE OF payment_status, tap_status, service_status
ON public.bahrain_emergency_requests
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_paid_request_admin_notification();
