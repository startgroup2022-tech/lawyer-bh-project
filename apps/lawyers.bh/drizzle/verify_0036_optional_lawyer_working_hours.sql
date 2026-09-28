DO $$
DECLARE
  invalid_columns TEXT;
BEGIN
  SELECT string_agg(format('%I.%I', table_name, column_name), ', ')
  INTO invalid_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN (
      SELECT table_prefix || '_lawyers'
      FROM public.countries
      WHERE tables_provisioned = true
    )
    AND column_name = 'working_hours'
    AND is_nullable <> 'YES';

  IF invalid_columns IS NOT NULL THEN
    RAISE EXCEPTION 'working_hours is still required in: %', invalid_columns;
  END IF;
END
$$;
