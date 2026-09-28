DO $$
DECLARE
  missing_constraint text;
BEGIN
  IF to_regclass('public.bahrain_communication_messages') IS NULL THEN
    RAISE EXCEPTION 'Missing communication messages table';
  END IF;
  IF to_regclass('public.bahrain_communication_calls') IS NULL THEN
    RAISE EXCEPTION 'Missing communication calls table';
  END IF;
  IF to_regclass('public.bahrain_communication_call_push_registrations') IS NULL THEN
    RAISE EXCEPTION 'Missing communication call push registrations table';
  END IF;

  IF to_regclass('public.bahrain_communication_messages_idempotency_uidx') IS NULL
    OR to_regclass('public.bahrain_communication_messages_request_cursor_idx') IS NULL
    OR to_regclass('public.bahrain_communication_calls_one_active_uidx') IS NULL
    OR to_regclass('public.bahrain_communication_calls_request_created_idx') IS NULL
    OR to_regclass('public.bahrain_communication_call_push_token_uidx') IS NULL
    OR to_regclass('public.bahrain_communication_call_push_actor_request_uidx') IS NULL
    OR to_regclass('public.bahrain_communication_call_push_request_actor_idx') IS NULL
  THEN
    RAISE EXCEPTION 'Missing one or more communication indexes';
  END IF;

  SELECT expected.name INTO missing_constraint
  FROM (
    VALUES
      ('bahrain_communication_messages_sender_role_check'),
      ('bahrain_communication_messages_body_check'),
      ('bahrain_communication_calls_initiator_role_check'),
      ('bahrain_communication_calls_media_kind_check'),
      ('bahrain_communication_calls_status_check'),
      ('bahrain_communication_calls_ended_by_role_check'),
      ('bahrain_communication_calls_duration_check'),
      ('bahrain_communication_call_push_actor_role_check'),
      ('bahrain_communication_call_push_platform_check'),
      ('bahrain_communication_call_push_token_type_check')
  ) AS expected(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = expected.name
  )
  LIMIT 1;

  IF missing_constraint IS NOT NULL THEN
    RAISE EXCEPTION 'Missing communication constraint: %', missing_constraint;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bahrain_communication_messages'::regclass
      AND contype = 'f'
      AND confrelid = 'public.bahrain_emergency_requests'::regclass
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bahrain_communication_calls'::regclass
      AND contype = 'f'
      AND confrelid = 'public.bahrain_emergency_requests'::regclass
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bahrain_communication_call_push_registrations'::regclass
      AND contype = 'f'
      AND confrelid = 'public.bahrain_emergency_requests'::regclass
  ) THEN
    RAISE EXCEPTION 'Missing communication request foreign key';
  END IF;
END $$;
