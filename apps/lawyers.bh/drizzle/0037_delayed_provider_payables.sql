DO $$
DECLARE
  country_record RECORD;
  allocation_table_name TEXT;
  status_constraint_name TEXT;
  paid_constraint_name TEXT;
  settlement_index_name TEXT;
BEGIN
  FOR country_record IN
    SELECT table_prefix
    FROM public.countries
    WHERE tables_provisioned = true
  LOOP
    allocation_table_name := country_record.table_prefix || '_payment_allocations';

    IF to_regclass(format('public.%I', allocation_table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I
         ADD COLUMN IF NOT EXISTS provider_name_snapshot text,
         ADD COLUMN IF NOT EXISTS provider_iban_snapshot text,
         ADD COLUMN IF NOT EXISTS settlement_status text NOT NULL DEFAULT ''not_applicable'',
         ADD COLUMN IF NOT EXISTS settlement_method text,
         ADD COLUMN IF NOT EXISTS settlement_reference text,
         ADD COLUMN IF NOT EXISTS settlement_transferred_at timestamptz,
         ADD COLUMN IF NOT EXISTS settlement_recorded_at timestamptz,
         ADD COLUMN IF NOT EXISTS settlement_recorded_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
         ADD COLUMN IF NOT EXISTS reconciliation_error text',
      allocation_table_name
    );

    status_constraint_name := allocation_table_name || '_settlement_status_check';
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = to_regclass(format('public.%I', allocation_table_name))
        AND conname = status_constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (
          settlement_status IN (
            ''not_applicable'', ''bank_pending'', ''processing'', ''paid_bank'',
            ''paid_tap'', ''failed'', ''cancelled''
          )
        )',
        allocation_table_name,
        status_constraint_name
      );
    END IF;

    paid_constraint_name := allocation_table_name || '_settlement_paid_check';
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = to_regclass(format('public.%I', allocation_table_name))
        AND conname = paid_constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (
          settlement_status NOT IN (''paid_bank'', ''paid_tap'') OR (
            settlement_method IS NOT NULL AND
            settlement_reference IS NOT NULL AND
            settlement_transferred_at IS NOT NULL AND
            settlement_recorded_at IS NOT NULL AND
            settlement_recorded_by IS NOT NULL
          )
        )',
        allocation_table_name,
        paid_constraint_name
      );
    END IF;

    settlement_index_name := allocation_table_name || '_settlement_status_captured_idx';
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (settlement_status, captured_at)',
      settlement_index_name,
      allocation_table_name
    );
  END LOOP;
END
$$;
