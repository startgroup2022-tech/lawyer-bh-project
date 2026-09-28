DO $$
BEGIN
  IF to_regclass('public.mobile_admin_paid_request_outbox') IS NULL THEN
    RAISE EXCEPTION 'mobile_admin_paid_request_outbox is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'bahrain_emergency_paid_admin_notification'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'paid request notification trigger is missing';
  END IF;
END
$$;
