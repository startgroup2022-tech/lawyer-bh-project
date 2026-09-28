DO $$
DECLARE
  missing_column text;
  missing_permission_count integer;
BEGIN
  SELECT required.column_name
  INTO missing_column
  FROM (VALUES
    ('created_by_admin_id'),
    ('updated_by_admin_id'),
    ('archived_at'),
    ('archived_by_admin_id')
  ) AS required(column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bahrain_consultation_methods'
      AND columns.column_name = required.column_name
  )
  LIMIT 1;

  IF missing_column IS NOT NULL THEN
    RAISE EXCEPTION 'Missing consultation method audit column: %', missing_column;
  END IF;

  SELECT count(*)
  INTO missing_permission_count
  FROM public.admin_users
  WHERE role IN ('admin', 'super_admin')
    AND is_active = true
    AND NOT (permissions @> '{"manage_consultation_types":true}'::jsonb);

  IF missing_permission_count <> 0 THEN
    RAISE EXCEPTION 'Active administrators missing manage_consultation_types: %', missing_permission_count;
  END IF;
END $$;
