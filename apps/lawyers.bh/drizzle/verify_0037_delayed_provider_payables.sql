DO $$
DECLARE
  country_record RECORD;
  allocation_table_name TEXT;
  missing_columns TEXT;
BEGIN
  FOR country_record IN
    SELECT table_prefix
    FROM public.countries
    WHERE tables_provisioned = true
  LOOP
    allocation_table_name := country_record.table_prefix || '_payment_allocations';

    IF to_regclass(format('public.%I', allocation_table_name)) IS NULL THEN
      RAISE EXCEPTION 'Provisioned allocation table is missing: %', allocation_table_name;
    END IF;

    SELECT string_agg(required_column, ', ' ORDER BY required_column)
    INTO missing_columns
    FROM unnest(ARRAY[
      'provider_name_snapshot',
      'provider_iban_snapshot',
      'settlement_status',
      'settlement_method',
      'settlement_reference',
      'settlement_transferred_at',
      'settlement_recorded_at',
      'settlement_recorded_by',
      'reconciliation_error'
    ]) AS required_column
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = allocation_table_name
        AND column_name = required_column
    );

    IF missing_columns IS NOT NULL THEN
      RAISE EXCEPTION 'Settlement columns missing from %: %', allocation_table_name, missing_columns;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = to_regclass(format('public.%I', allocation_table_name))
        AND conname = allocation_table_name || '_settlement_status_check'
    ) THEN
      RAISE EXCEPTION 'Settlement status constraint missing from %', allocation_table_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = to_regclass(format('public.%I', allocation_table_name))
        AND conname = allocation_table_name || '_settlement_paid_check'
    ) THEN
      RAISE EXCEPTION 'Paid settlement constraint missing from %', allocation_table_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = allocation_table_name
        AND indexname = allocation_table_name || '_settlement_status_captured_idx'
    ) THEN
      RAISE EXCEPTION 'Settlement status index missing from %', allocation_table_name;
    END IF;
  END LOOP;
END
$$;
