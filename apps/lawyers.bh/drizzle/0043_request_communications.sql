CREATE TABLE IF NOT EXISTS public.bahrain_communication_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.bahrain_emergency_requests(id) ON DELETE CASCADE,
  sender_role text NOT NULL,
  sender_id text NOT NULL,
  client_message_id uuid NOT NULL,
  body varchar(4000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT bahrain_communication_messages_sender_role_check
    CHECK (sender_role IN ('client', 'lawyer')),
  CONSTRAINT bahrain_communication_messages_body_check
    CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS bahrain_communication_messages_idempotency_uidx
  ON public.bahrain_communication_messages
  (request_id, sender_role, sender_id, client_message_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS bahrain_communication_messages_request_cursor_idx
  ON public.bahrain_communication_messages (request_id, created_at, id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.bahrain_communication_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.bahrain_emergency_requests(id) ON DELETE CASCADE,
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
  CONSTRAINT bahrain_communication_calls_initiator_role_check
    CHECK (initiator_role IN ('client', 'lawyer')),
  CONSTRAINT bahrain_communication_calls_media_kind_check
    CHECK (media_kind IN ('audio', 'video')),
  CONSTRAINT bahrain_communication_calls_status_check
    CHECK (status IN ('ringing', 'accepted', 'connected', 'ended', 'rejected', 'missed', 'cancelled', 'failed')),
  CONSTRAINT bahrain_communication_calls_ended_by_role_check
    CHECK (ended_by_role IS NULL OR ended_by_role IN ('client', 'lawyer')),
  CONSTRAINT bahrain_communication_calls_duration_check
    CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS bahrain_communication_calls_one_active_uidx
  ON public.bahrain_communication_calls (request_id)
  WHERE status IN ('ringing', 'accepted', 'connected');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS bahrain_communication_calls_request_created_idx
  ON public.bahrain_communication_calls (request_id, created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.bahrain_communication_call_push_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.bahrain_emergency_requests(id) ON DELETE CASCADE,
  actor_role text NOT NULL,
  actor_id text NOT NULL,
  platform varchar(16) NOT NULL,
  token_type varchar(16) NOT NULL,
  token text NOT NULL,
  locale varchar(5) NOT NULL DEFAULT 'ar',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bahrain_communication_call_push_actor_role_check
    CHECK (actor_role IN ('client', 'lawyer')),
  CONSTRAINT bahrain_communication_call_push_platform_check
    CHECK (platform IN ('ios', 'android')),
  CONSTRAINT bahrain_communication_call_push_token_type_check
    CHECK (token_type IN ('voip', 'fcm'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS bahrain_communication_call_push_token_uidx
  ON public.bahrain_communication_call_push_registrations (token);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS bahrain_communication_call_push_actor_request_uidx
  ON public.bahrain_communication_call_push_registrations
  (request_id, actor_role, actor_id, platform, token_type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS bahrain_communication_call_push_request_actor_idx
  ON public.bahrain_communication_call_push_registrations
  (request_id, actor_role, actor_id);
