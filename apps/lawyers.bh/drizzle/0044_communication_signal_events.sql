CREATE TABLE IF NOT EXISTS public.bahrain_communication_signal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.bahrain_emergency_requests(id) ON DELETE CASCADE,
  sender_role text NOT NULL,
  event jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 minutes'),
  CONSTRAINT bahrain_communication_signal_events_sender_role_check
    CHECK (sender_role IN ('client', 'lawyer'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS bahrain_communication_signal_events_expiry_idx
  ON public.bahrain_communication_signal_events (expires_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS bahrain_communication_signal_events_request_idx
  ON public.bahrain_communication_signal_events (request_id, created_at);
