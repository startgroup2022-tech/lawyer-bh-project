DO $$
DECLARE
  constraint_name text;
  index_name text;
BEGIN
  IF to_regclass('public.saraya_auth_audit_logs') IS NULL THEN
    RAISE EXCEPTION 'saraya_auth_audit_logs table is missing';
  END IF;

  FOREACH constraint_name IN ARRAY ARRAY[
    'saraya_auth_audit_logs_challenge_fk',
    'saraya_auth_audit_logs_user_fk',
    'saraya_auth_audit_logs_event_check',
    'saraya_auth_audit_logs_outcome_check',
    'saraya_auth_audit_logs_reason_check',
    'saraya_auth_audit_logs_metadata_check'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint constraint_row
      JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
      JOIN pg_namespace schema_row ON schema_row.oid = table_row.relnamespace
      WHERE schema_row.nspname = 'public'
        AND table_row.relname = 'saraya_auth_audit_logs'
        AND constraint_row.conname = constraint_name
    ) THEN
      RAISE EXCEPTION 'Missing or incorrectly scoped %', constraint_name;
    END IF;
  END LOOP;

  FOREACH index_name IN ARRAY ARRAY[
    'saraya_auth_audit_logs_challenge_created_idx',
    'saraya_auth_audit_logs_user_created_idx',
    'saraya_auth_audit_logs_event_created_idx'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'saraya_auth_audit_logs'
        AND indexname = index_name
    ) THEN
      RAISE EXCEPTION 'Missing %', index_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_row
    JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
    JOIN pg_namespace schema_row ON schema_row.oid = table_row.relnamespace
    WHERE schema_row.nspname = 'public'
      AND table_row.relname = 'saraya_auth_audit_logs'
      AND constraint_row.conname = 'saraya_auth_audit_logs_event_check'
      AND pg_get_constraintdef(constraint_row.oid) LIKE '%verify.succeeded%'
      AND pg_get_constraintdef(constraint_row.oid) LIKE '%verify.failed%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_auth_audit_logs_event_check definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_row
    JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
    JOIN pg_namespace schema_row ON schema_row.oid = table_row.relnamespace
    WHERE schema_row.nspname = 'public'
      AND table_row.relname = 'saraya_auth_audit_logs'
      AND constraint_row.conname = 'saraya_auth_audit_logs_outcome_check'
      AND pg_get_constraintdef(constraint_row.oid) LIKE '%accepted%'
      AND pg_get_constraintdef(constraint_row.oid) LIKE '%succeeded%'
      AND pg_get_constraintdef(constraint_row.oid) LIKE '%failed%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_auth_audit_logs_outcome_check definition';
  END IF;
END $$;
