DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bahrain_emergency_requests'
      AND column_name IN (
        'mobile_payment_idempotency_key',
        'mobile_payment_case_id',
        'tap_charge_id',
        'tap_status',
        'tap_payload'
      )
    GROUP BY table_schema, table_name
    HAVING count(*) = 5
  ) IS NOT TRUE THEN
    RAISE EXCEPTION 'emergency payment columns are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bahrain_payment_allocations'
      AND column_name = 'emergency_request_id'
  ) THEN
    RAISE EXCEPTION 'payment allocation emergency parent is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.bahrain_payment_allocations'::regclass
      AND conname = 'payment_allocations_exactly_one_request_check'
  ) THEN
    RAISE EXCEPTION 'payment allocation exclusive parent check is missing';
  END IF;
END;
$$;
