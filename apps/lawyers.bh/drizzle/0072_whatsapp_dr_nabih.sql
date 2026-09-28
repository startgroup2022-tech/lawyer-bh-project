CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id text NOT NULL,
  customer_wa_id text NOT NULL,
  language varchar(2) NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  workflow_state text NOT NULL DEFAULT 'discovery',
  selections jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  openai_response_id text,
  human_handoff boolean NOT NULL DEFAULT false,
  human_handoff_reason text,
  human_handoff_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone_number_id, customer_wa_id)
);

CREATE INDEX whatsapp_conversations_handoff_idx
  ON public.whatsapp_conversations (human_handoff, updated_at);

CREATE TABLE public.whatsapp_processed_events (
  message_id text PRIMARY KEY,
  conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX whatsapp_processed_events_created_idx
  ON public.whatsapp_processed_events (created_at);

CREATE TABLE public.whatsapp_confirmation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_digest text NOT NULL UNIQUE,
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  selections jsonb NOT NULL,
  value_fingerprint text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX whatsapp_confirmation_snapshots_expiry_idx
  ON public.whatsapp_confirmation_snapshots (expires_at)
  WHERE consumed_at IS NULL;
