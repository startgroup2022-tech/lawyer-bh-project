DO $$
DECLARE
  country_row record;
  catalogue_table text;
  invalid_count bigint;
BEGIN
  FOR country_row IN
    SELECT table_prefix
    FROM public.countries
    WHERE is_active = true
  LOOP
    catalogue_table := country_row.table_prefix || '_emergency_case_types';

    IF to_regclass('public.' || catalogue_table) IS NULL THEN
      RAISE EXCEPTION '% is missing', catalogue_table;
    END IF;

    EXECUTE format(
      'SELECT count(*) FROM ONLY public.%I WHERE workflow_type NOT IN ($1, $2)',
      catalogue_table
    )
    INTO invalid_count
    USING 'emergency_dispatch', 'direct_consultation';

    IF invalid_count <> 0 THEN
      RAISE EXCEPTION '% contains invalid workflow rows', catalogue_table;
    END IF;
  END LOOP;
END $$;
