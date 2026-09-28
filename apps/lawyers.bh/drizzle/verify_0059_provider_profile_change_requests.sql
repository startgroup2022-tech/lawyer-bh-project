DO $$
BEGIN
  IF to_regclass('public.provider_profile_change_requests') IS NULL THEN
    RAISE EXCEPTION 'provider_profile_change_requests table is missing';
  END IF;
  IF to_regclass('public.provider_profile_changes_one_pending_uidx') IS NULL THEN
    RAISE EXCEPTION 'pending profile change unique index is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'provider_profile_changes_status_check'
  ) THEN
    RAISE EXCEPTION 'profile change status check is missing';
  END IF;
END $$;
