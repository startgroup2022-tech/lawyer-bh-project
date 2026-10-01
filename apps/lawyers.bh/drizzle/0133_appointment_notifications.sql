-- Appointment notification center. Persisted notifications for the normal
-- (non-SOS) client <-> lawyer appointment flow, for both recipients.
--
-- Kept separate from mobile_client_notifications / mobile_lawyer_notifications,
-- which are SOS-request-scoped (their request_id FKs point at
-- bahrain_emergency_requests and the client inbox authorizes by verified
-- request capabilities). Appointment notifications are authorized by the real
-- client/lawyer session instead, so the two inboxes must not share rows.

CREATE TABLE IF NOT EXISTS public.bahrain_appointment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id uuid NOT NULL REFERENCES public.bahrain_booking_requests (id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.bahrain_appointment_conversations (id) ON DELETE CASCADE,
  recipient_role text NOT NULL,
  recipient_id uuid NOT NULL,
  kind text NOT NULL,
  entity_id text,
  deep_link text,
  title_ar text,
  title_en text,
  body_ar text,
  body_en text,
  source_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT appointment_notifications_recipient_role_check CHECK (recipient_role IN ('client', 'lawyer'))
);

-- Idempotency: the same event can never produce two rows for one recipient.
CREATE UNIQUE INDEX IF NOT EXISTS appointment_notifications_source_key_uidx
  ON public.bahrain_appointment_notifications (source_key);

CREATE INDEX IF NOT EXISTS appointment_notifications_owner_cursor_idx
  ON public.bahrain_appointment_notifications (recipient_role, recipient_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS appointment_notifications_booking_idx
  ON public.bahrain_appointment_notifications (booking_request_id);
