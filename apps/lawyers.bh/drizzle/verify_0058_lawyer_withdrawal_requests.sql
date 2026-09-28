DO $$
BEGIN
  IF to_regclass('public.lawyer_withdrawal_requests') IS NULL THEN
    RAISE EXCEPTION 'lawyer_withdrawal_requests is missing';
  END IF;
  IF to_regclass('public.lawyer_withdrawal_allocations') IS NULL THEN
    RAISE EXCEPTION 'lawyer_withdrawal_allocations is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'lawyer_withdrawal_allocations'
      AND indexdef LIKE 'CREATE UNIQUE INDEX%allocation_id%'
  ) THEN
    RAISE EXCEPTION 'allocation reservation uniqueness is missing';
  END IF;
END
$$;
