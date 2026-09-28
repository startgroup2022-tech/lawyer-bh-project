DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='mobile_admin_escalation_outbox' AND column_name='report_id'
  ) THEN RAISE EXCEPTION 'Missing moderation report outbox reference'; END IF;
  IF to_regclass('public.mobile_admin_moderation_report_uidx') IS NULL THEN
    RAISE EXCEPTION 'Missing moderation report outbox uniqueness';
  END IF;
END $$;
