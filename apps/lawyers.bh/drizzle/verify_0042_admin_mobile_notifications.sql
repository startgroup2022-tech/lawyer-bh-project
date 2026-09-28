DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bahrain_mobile_push_installations'
      AND column_name = 'audience_role'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'Missing non-null audience_role column';
  END IF;

  IF to_regclass('public.bahrain_admin_mobile_notification_sends') IS NULL THEN
    RAISE EXCEPTION 'Missing admin mobile notification send history table';
  END IF;

  IF to_regclass('public.bahrain_mobile_push_installations_audience_role_idx') IS NULL THEN
    RAISE EXCEPTION 'Missing audience role index';
  END IF;
END $$;
