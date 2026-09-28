DO $$
BEGIN
  IF to_regclass('public.bahrain_communication_signal_events') IS NULL THEN
    RAISE EXCEPTION 'Missing communication signal events table';
  END IF;
  IF to_regclass('public.bahrain_communication_signal_events_expiry_idx') IS NULL
    OR to_regclass('public.bahrain_communication_signal_events_request_idx') IS NULL THEN
    RAISE EXCEPTION 'Missing communication signal event indexes';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bahrain_communication_signal_events_sender_role_check'
  ) THEN
    RAISE EXCEPTION 'Missing signal event sender role constraint';
  END IF;
END $$;
