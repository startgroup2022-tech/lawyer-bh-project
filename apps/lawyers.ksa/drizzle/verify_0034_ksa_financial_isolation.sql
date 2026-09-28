DO $$
DECLARE
  missing_table text;
  missing_column text;
  invalid_count bigint;
BEGIN
  SELECT required.name INTO missing_table
  FROM (VALUES
    ('saudi_lawyers'),
    ('saudi_booking_requests'),
    ('saudi_emergency_requests'),
    ('saudi_emergency_case_types'),
    ('saudi_consultation_methods'),
    ('saudi_provider_commission_rates'),
    ('saudi_payment_allocations'),
    ('saudi_tap_retailer_onboarding')
  ) AS required(name)
  WHERE to_regclass('public.' || required.name) IS NULL
  LIMIT 1;

  IF missing_table IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Saudi table: %', missing_table;
  END IF;

  SELECT required.column_name INTO missing_column
  FROM (VALUES
    ('saudi_booking_requests', 'currency_code'),
    ('saudi_booking_requests', 'amount'),
    ('saudi_booking_requests', 'original_amount'),
    ('saudi_booking_requests', 'discount_amount'),
    ('saudi_booking_requests', 'final_amount'),
    ('saudi_emergency_requests', 'currency_code'),
    ('saudi_emergency_requests', 'base_fee'),
    ('saudi_emergency_requests', 'refund_amount')
  ) AS required(table_name, column_name)
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public'
   AND c.table_name = required.table_name
   AND c.column_name = required.column_name
  WHERE c.column_name IS NULL
  LIMIT 1;

  IF missing_column IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Saudi financial column: %', missing_column;
  END IF;

  SELECT count(*) INTO invalid_count
  FROM public.saudi_booking_requests
  WHERE country_code <> 'SA' OR currency_code <> 'SAR';
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Saudi bookings contain invalid country/currency rows: %', invalid_count;
  END IF;

  SELECT count(*) INTO invalid_count
  FROM public.saudi_emergency_requests
  WHERE country_code <> 'SA' OR currency_code <> 'SAR';
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Saudi emergencies contain invalid country/currency rows: %', invalid_count;
  END IF;

  SELECT count(*) INTO invalid_count
  FROM pg_constraint child_constraint
  JOIN pg_class child ON child.oid = child_constraint.conrelid
  JOIN pg_class parent ON parent.oid = child_constraint.confrelid
  JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
  JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
  WHERE child_constraint.contype = 'f'
    AND child_ns.nspname = 'public'
    AND parent_ns.nspname = 'public'
    AND child.relname LIKE 'saudi\_%' ESCAPE '\'
    AND parent.relname LIKE 'bahrain\_%' ESCAPE '\';
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Saudi tables contain % Bahrain foreign keys', invalid_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class child ON child.oid = c.conrelid
    JOIN pg_class parent ON parent.oid = c.confrelid
    WHERE c.contype = 'f'
      AND child.relname = 'saudi_tap_retailer_onboarding'
      AND parent.relname = 'saudi_lawyers'
  ) THEN
    RAISE EXCEPTION 'Saudi Tap onboarding lawyer foreign key is missing';
  END IF;

  SELECT count(*) INTO invalid_count
  FROM (VALUES
    ('saudi_tap_lawyer_env_uidx'),
    ('saudi_tap_lead_env_uidx'),
    ('saudi_tap_retailer_env_uidx'),
    ('saudi_tap_destination_env_uidx'),
    ('saudi_tap_stage_idx'),
    ('saudi_tap_retailer_idx')
  ) AS required(index_name)
  LEFT JOIN pg_indexes i
    ON i.schemaname = 'public'
   AND i.indexname = required.index_name
  WHERE i.indexname IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Saudi Tap onboarding is missing % indexes', invalid_count;
  END IF;
END;
$$;
