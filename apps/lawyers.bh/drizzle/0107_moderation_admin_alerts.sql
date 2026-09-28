ALTER TABLE public.mobile_admin_escalation_outbox
  ADD COLUMN IF NOT EXISTS report_id uuid REFERENCES public.bahrain_communication_reports(id) ON DELETE CASCADE;

ALTER TABLE public.mobile_admin_escalation_outbox
  DROP CONSTRAINT IF EXISTS mobile_admin_escalation_outbox_event_check;
ALTER TABLE public.mobile_admin_escalation_outbox
  DROP CONSTRAINT IF EXISTS mobile_admin_escalation_outbox_unique;

ALTER TABLE public.mobile_admin_escalation_outbox
  ADD CONSTRAINT mobile_admin_escalation_outbox_event_check
  CHECK (
    (event_type='admin_request_escalated' AND report_id IS NULL)
    OR (event_type='moderation_report' AND report_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS mobile_admin_escalation_request_uidx
  ON public.mobile_admin_escalation_outbox (request_id, event_type)
  WHERE event_type='admin_request_escalated';

CREATE UNIQUE INDEX IF NOT EXISTS mobile_admin_moderation_report_uidx
  ON public.mobile_admin_escalation_outbox (report_id, event_type)
  WHERE event_type='moderation_report';
