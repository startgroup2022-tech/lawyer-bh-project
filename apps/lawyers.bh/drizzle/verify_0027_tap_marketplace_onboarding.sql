DO $$
DECLARE
  onboarding_columns integer;
  allocation_columns integer;
BEGIN
  IF to_regclass('public.bahrain_tap_retailer_onboarding') IS NULL THEN
    RAISE EXCEPTION 'bahrain_tap_retailer_onboarding is missing';
  END IF;

  IF to_regclass('public.bahrain_payment_allocations') IS NULL THEN
    RAISE EXCEPTION 'bahrain_payment_allocations is missing';
  END IF;

  SELECT count(*)
  INTO onboarding_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'bahrain_tap_retailer_onboarding'
    AND column_name IN (
      'lawyer_id', 'environment', 'marketplace_mid', 'stage',
      'commercial_registration_file_id', 'personal_id_file_id',
      'iban_certificate_file_id', 'lead_id', 'retailer_id',
      'destination_id', 'kyc_status', 'payout_enabled', 'attempt_count',
      'last_completed_stage', 'last_error_code', 'last_error_message',
      'last_attempt_at', 'activated_at', 'created_at', 'updated_at'
    );

  IF onboarding_columns <> 20 THEN
    RAISE EXCEPTION 'Tap onboarding columns are incomplete: % of 20', onboarding_columns;
  END IF;

  SELECT count(*)
  INTO allocation_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'bahrain_payment_allocations'
    AND column_name IN (
      'split_mode', 'destination_id', 'split_executed_at', 'split_error'
    );

  IF allocation_columns <> 4 THEN
    RAISE EXCEPTION 'Payment allocation split columns are incomplete: % of 4', allocation_columns;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bahrain_tap_retailer_onboarding'::regclass
      AND conname = 'tap_retailer_onboarding_lawyer_id_bahrain_lawyers_id_fk'
      AND contype = 'f'
      AND confdeltype = 'c'
      AND confrelid = 'public.bahrain_lawyers'::regclass
  ) THEN
    RAISE EXCEPTION 'Tap onboarding lawyer cascade foreign key is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bahrain_payment_allocations'
      AND column_name = 'split_mode'
      AND data_type = 'text'
      AND is_nullable = 'NO'
      AND column_default = '''legacy''::text'
  ) THEN
    RAISE EXCEPTION 'Payment allocation split_mode type/default/nullability is invalid';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_constraint
    WHERE conrelid = 'public.bahrain_tap_retailer_onboarding'::regclass
      AND conname IN (
        'tap_retailer_onboarding_environment_check',
        'tap_retailer_onboarding_stage_check',
        'tap_retailer_onboarding_attempt_count_check'
      )
  ) <> 3 THEN
    RAISE EXCEPTION 'Tap onboarding check constraints are incomplete';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bahrain_tap_retailer_onboarding'::regclass
      AND conname = 'tap_retailer_onboarding_environment_check'
      AND pg_get_constraintdef(oid) ILIKE '%environment%test%live%'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bahrain_tap_retailer_onboarding'::regclass
      AND conname = 'tap_retailer_onboarding_stage_check'
      AND pg_get_constraintdef(oid) ILIKE '%pending_admin%'
      AND pg_get_constraintdef(oid) ILIKE '%tap_uploading_files%'
      AND pg_get_constraintdef(oid) ILIKE '%tap_creating_lead%'
      AND pg_get_constraintdef(oid) ILIKE '%tap_creating_retailer%'
      AND pg_get_constraintdef(oid) ILIKE '%tap_kyc_pending%'
      AND pg_get_constraintdef(oid) ILIKE '%tap_failed%'
      AND pg_get_constraintdef(oid) ILIKE '%active%'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bahrain_tap_retailer_onboarding'::regclass
      AND conname = 'tap_retailer_onboarding_attempt_count_check'
      AND pg_get_constraintdef(oid) ILIKE '%attempt_count >= 0%'
  ) THEN
    RAISE EXCEPTION 'Tap onboarding check constraint definitions are invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bahrain_payment_allocations'::regclass
      AND conname = 'payment_allocations_split_mode_check'
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%legacy%platform_only%instant%delayed%'
  ) THEN
    RAISE EXCEPTION 'Payment allocation split mode check is missing';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'bahrain_tap_retailer_onboarding'
      AND indexname IN (
        'tap_retailer_onboarding_lawyer_env_unique_idx',
        'tap_retailer_onboarding_lead_env_unique_idx',
        'tap_retailer_onboarding_retailer_env_unique_idx',
        'tap_retailer_onboarding_destination_env_unique_idx',
        'tap_retailer_onboarding_stage_idx',
        'tap_retailer_onboarding_retailer_idx'
      )
  ) <> 6 THEN
    RAISE EXCEPTION 'Tap onboarding indexes are incomplete';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'tap_retailer_onboarding_lawyer_env_unique_idx'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%lawyer_id, environment%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'tap_retailer_onboarding_lead_env_unique_idx'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%environment, lead_id%WHERE (lead_id IS NOT NULL)%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'tap_retailer_onboarding_retailer_env_unique_idx'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%environment, retailer_id%WHERE (retailer_id IS NOT NULL)%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'tap_retailer_onboarding_destination_env_unique_idx'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%environment, destination_id%WHERE (destination_id IS NOT NULL)%'
  ) THEN
    RAISE EXCEPTION 'Tap onboarding unique index definitions are invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'bahrain_payment_allocations'
      AND indexname = 'payment_allocations_split_mode_idx'
  ) THEN
    RAISE EXCEPTION 'Payment allocation split mode index is missing';
  END IF;
END
$$;

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'bahrain_tap_retailer_onboarding',
    'bahrain_payment_allocations'
  )
ORDER BY table_name, ordinal_position;

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'bahrain_tap_retailer_onboarding',
    'bahrain_payment_allocations'
  )
ORDER BY tablename, indexname;
