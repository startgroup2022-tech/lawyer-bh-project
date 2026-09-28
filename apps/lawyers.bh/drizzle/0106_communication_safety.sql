CREATE TABLE IF NOT EXISTS public.bahrain_communication_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_role text NOT NULL,
  blocker_id text NOT NULL,
  blocked_role text NOT NULL,
  blocked_id text NOT NULL,
  request_id uuid REFERENCES public.bahrain_emergency_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT bahrain_communication_blocks_roles_check
    CHECK (blocker_role IN ('client', 'lawyer') AND blocked_role IN ('client', 'lawyer')),
  CONSTRAINT bahrain_communication_blocks_distinct_actor_check
    CHECK (blocker_role <> blocked_role OR blocker_id <> blocked_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS bahrain_communication_blocks_active_uidx
  ON public.bahrain_communication_blocks (blocker_role, blocker_id, blocked_role, blocked_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS bahrain_communication_blocks_blocked_idx
  ON public.bahrain_communication_blocks (blocked_role, blocked_id)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.bahrain_communication_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.bahrain_emergency_requests(id) ON DELETE SET NULL,
  reporter_role text NOT NULL,
  reporter_id text NOT NULL,
  reported_role text NOT NULL,
  reported_id text NOT NULL,
  category text NOT NULL,
  description varchar(1000),
  status text NOT NULL DEFAULT 'open',
  evidence_message_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  resolved_at timestamptz,
  reviewed_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  resolution_note varchar(2000),
  CONSTRAINT bahrain_communication_reports_roles_check
    CHECK (reporter_role IN ('client', 'lawyer') AND reported_role IN ('client', 'lawyer')),
  CONSTRAINT bahrain_communication_reports_category_check
    CHECK (category IN ('harassment', 'threat_or_hate', 'fraud_or_spam', 'sexual_or_inappropriate', 'privacy', 'other')),
  CONSTRAINT bahrain_communication_reports_status_check
    CHECK (status IN ('open', 'dismissed', 'actioned')),
  CONSTRAINT bahrain_communication_reports_description_check
    CHECK (description IS NULL OR char_length(btrim(description)) BETWEEN 1 AND 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS bahrain_communication_reports_idempotency_uidx
  ON public.bahrain_communication_reports (reporter_role, reporter_id, idempotency_key);

CREATE INDEX IF NOT EXISTS bahrain_communication_reports_queue_idx
  ON public.bahrain_communication_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS bahrain_communication_reports_reported_idx
  ON public.bahrain_communication_reports (reported_role, reported_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.bahrain_communication_moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.bahrain_communication_reports(id) ON DELETE SET NULL,
  target_role text NOT NULL,
  target_id text NOT NULL,
  action text NOT NULL,
  admin_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  internal_reason varchar(2000) NOT NULL,
  public_message_ar varchar(2000),
  public_message_en varchar(2000),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz,
  reversed_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  reversal_reason varchar(2000),
  CONSTRAINT bahrain_communication_moderation_actions_role_check
    CHECK (target_role IN ('client', 'lawyer')),
  CONSTRAINT bahrain_communication_moderation_actions_action_check
    CHECK (action IN ('dismissal', 'warning', 'chat_suspension', 'account_suspension', 'chat_reactivation', 'account_reactivation')),
  CONSTRAINT bahrain_communication_moderation_actions_reason_check
    CHECK (char_length(btrim(internal_reason)) BETWEEN 1 AND 2000),
  CONSTRAINT bahrain_communication_moderation_actions_expiry_check
    CHECK (action <> 'chat_suspension' OR expires_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS bahrain_communication_moderation_actions_target_idx
  ON public.bahrain_communication_moderation_actions (target_role, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bahrain_communication_moderation_actions_active_chat_idx
  ON public.bahrain_communication_moderation_actions (target_role, target_id, expires_at)
  WHERE action = 'chat_suspension' AND reversed_at IS NULL;
