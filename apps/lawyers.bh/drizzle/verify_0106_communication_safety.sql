DO $$
BEGIN
  IF to_regclass('public.bahrain_communication_blocks') IS NULL THEN
    RAISE EXCEPTION 'Missing communication blocks table';
  END IF;
  IF to_regclass('public.bahrain_communication_reports') IS NULL THEN
    RAISE EXCEPTION 'Missing communication reports table';
  END IF;
  IF to_regclass('public.bahrain_communication_moderation_actions') IS NULL THEN
    RAISE EXCEPTION 'Missing communication moderation actions table';
  END IF;
  IF to_regclass('public.bahrain_communication_blocks_active_uidx') IS NULL THEN
    RAISE EXCEPTION 'Missing active communication block uniqueness';
  END IF;
  IF to_regclass('public.bahrain_communication_reports_idempotency_uidx') IS NULL THEN
    RAISE EXCEPTION 'Missing communication report idempotency';
  END IF;
END $$;
