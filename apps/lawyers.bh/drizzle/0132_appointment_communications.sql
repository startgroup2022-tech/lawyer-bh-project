-- Normal (non-emergency) appointment communications: the conversation between
-- a client and the lawyer they booked, its messages, its voice/video call
-- state, the signaling events that carry WebRTC offer/answer/ICE, the durable
-- reminder outbox and the meeting-session audit.
--
-- These mirror the SOS emergency tables (bahrain_communication_*) but are keyed
-- by the *appointment* (bahrain_booking_requests) rather than the emergency
-- request, so the two business contexts never share authorization. The SOS
-- tables and routes are left untouched.

-- One conversation per booking. `client_account_id`/`lawyer_id` are denormalised
-- from the booking so authorization is a single row lookup, and the foreign keys
-- guarantee a conversation can only exist for a real booking/account/lawyer.
CREATE TABLE IF NOT EXISTS public.bahrain_appointment_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  booking_request_id uuid NOT NULL REFERENCES public.bahrain_booking_requests (id) ON DELETE CASCADE,
  client_account_id uuid REFERENCES public.mobile_client_accounts (id) ON DELETE SET NULL,
  lawyer_id uuid REFERENCES public.bahrain_lawyers (id) ON DELETE SET NULL,
  client_last_read_at timestamptz,
  lawyer_last_read_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS appointment_conversations_booking_uidx
  ON public.bahrain_appointment_conversations (booking_request_id);

CREATE INDEX IF NOT EXISTS appointment_conversations_client_idx
  ON public.bahrain_appointment_conversations (client_account_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS appointment_conversations_lawyer_idx
  ON public.bahrain_appointment_conversations (lawyer_id, last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.bahrain_appointment_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.bahrain_appointment_conversations (id) ON DELETE CASCADE,
  sender_role text NOT NULL,
  sender_id text NOT NULL,
  client_message_id uuid NOT NULL,
  body varchar(4000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  read_at timestamptz,
  CONSTRAINT appointment_messages_sender_role_check CHECK (sender_role IN ('client', 'lawyer')),
  CONSTRAINT appointment_messages_body_check CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000)
);

-- Retrying a send with the same clientMessageId must not duplicate the row.
CREATE UNIQUE INDEX IF NOT EXISTS appointment_messages_idempotency_uidx
  ON public.bahrain_appointment_messages (conversation_id, sender_role, sender_id, client_message_id);

CREATE INDEX IF NOT EXISTS appointment_messages_cursor_idx
  ON public.bahrain_appointment_messages (conversation_id, created_at DESC, id DESC);

-- Voice/video call state machine. One active call per conversation at a time.
CREATE TABLE IF NOT EXISTS public.bahrain_appointment_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.bahrain_appointment_conversations (id) ON DELETE CASCADE,
  initiator_role text NOT NULL,
  initiator_id text NOT NULL,
  media_kind text NOT NULL,
  status text NOT NULL DEFAULT 'ringing',
  ringing_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  connected_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  end_reason text,
  ended_by_role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_calls_initiator_role_check CHECK (initiator_role IN ('client', 'lawyer')),
  CONSTRAINT appointment_calls_media_kind_check CHECK (media_kind IN ('audio', 'video')),
  CONSTRAINT appointment_calls_status_check CHECK (status IN ('ringing', 'accepted', 'connected', 'ended', 'rejected', 'missed', 'cancelled', 'failed')),
  CONSTRAINT appointment_calls_ended_by_role_check CHECK (ended_by_role IS NULL OR ended_by_role IN ('client', 'lawyer')),
  CONSTRAINT appointment_calls_duration_check CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS appointment_calls_one_active_uidx
  ON public.bahrain_appointment_calls (conversation_id)
  WHERE status IN ('ringing', 'accepted', 'connected');

CREATE INDEX IF NOT EXISTS appointment_calls_conversation_created_idx
  ON public.bahrain_appointment_calls (conversation_id, created_at);

-- Durable signaling bus. Rows expire so a stale tab cannot resurrect a dead
-- call; NOTIFY is only the low-latency path and replay covers missed frames.
CREATE TABLE IF NOT EXISTS public.bahrain_appointment_signal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.bahrain_appointment_conversations (id) ON DELETE CASCADE,
  sender_role text NOT NULL,
  event jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '2 minutes',
  CONSTRAINT appointment_signal_events_sender_role_check CHECK (sender_role IN ('client', 'lawyer'))
);

CREATE INDEX IF NOT EXISTS appointment_signal_events_expiry_idx
  ON public.bahrain_appointment_signal_events (expires_at);

CREATE INDEX IF NOT EXISTS appointment_signal_events_conversation_idx
  ON public.bahrain_appointment_signal_events (conversation_id, created_at);

-- Meeting session audit: opening/joining the appointment meeting. Authorization
-- is derived from the appointment each time; this row only records who opened
-- it and when it closed.
CREATE TABLE IF NOT EXISTS public.bahrain_appointment_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.bahrain_appointment_conversations (id) ON DELETE CASCADE,
  booking_request_id uuid NOT NULL REFERENCES public.bahrain_booking_requests (id) ON DELETE CASCADE,
  opened_by_role text NOT NULL,
  opened_by_id text NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CONSTRAINT appointment_meetings_opened_by_role_check CHECK (opened_by_role IN ('client', 'lawyer'))
);

CREATE INDEX IF NOT EXISTS appointment_meetings_conversation_idx
  ON public.bahrain_appointment_meetings (conversation_id, opened_at DESC);

-- Reminder outbox. `due_at` is derived from the real appointment timestamp, so
-- a cancelled appointment can be cancelled out of the queue and a rescheduled
-- one simply moves. The (booking_request_id, reminder_kind) unique index is the
-- idempotency guarantee: re-scheduling updates the existing row instead of
-- inserting a duplicate, and claiming uses FOR UPDATE SKIP LOCKED + a lease so
-- two workers can never both send the same reminder.
CREATE TABLE IF NOT EXISTS public.bahrain_appointment_reminder_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id uuid NOT NULL REFERENCES public.bahrain_booking_requests (id) ON DELETE CASCADE,
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  reminder_kind text NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_reminder_kind_check CHECK (reminder_kind IN ('reminder_24h', 'reminder_1h', 'reminder_15m', 'starting')),
  CONSTRAINT appointment_reminder_status_check CHECK (status IN ('pending', 'leased', 'sent', 'skipped', 'cancelled', 'failed')),
  CONSTRAINT appointment_reminder_attempts_check CHECK (attempt_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS appointment_reminder_booking_kind_uidx
  ON public.bahrain_appointment_reminder_outbox (booking_request_id, reminder_kind);

CREATE INDEX IF NOT EXISTS appointment_reminder_due_idx
  ON public.bahrain_appointment_reminder_outbox (status, due_at);

-- Appointment status machine: the columns the transitions write. Additive and
-- nullable so existing rows are untouched.
ALTER TABLE public.bahrain_booking_requests
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_opt_in boolean NOT NULL DEFAULT true;
