DO $$
DECLARE
  country_row record;
  catalogue_count integer;
BEGIN
  IF to_regclass('public.bahrain_emergency_case_types') IS NULL THEN
    RAISE EXCEPTION 'bahrain_emergency_case_types is missing';
  END IF;

  SELECT count(*)
  INTO catalogue_count
  FROM ONLY public.bahrain_emergency_case_types
  WHERE is_active = true
    AND price > 0;

  IF catalogue_count < 6 THEN
    RAISE EXCEPTION
      'Expected at least 6 active Bahrain emergency case types, found %',
      catalogue_count;
  END IF;

  FOR country_row IN
    SELECT code, table_prefix
    FROM public.countries
    WHERE tables_provisioned = true
  LOOP
    IF to_regclass(
      'public.' || country_row.table_prefix || '_emergency_case_types'
    ) IS NULL THEN
      RAISE EXCEPTION
        'Emergency catalogue table is missing for country %',
        country_row.code;
    END IF;
  END LOOP;
END $$;

SELECT
  slug,
  name_ar,
  name_en,
  description_ar,
  price,
  currency_code,
  is_active
FROM ONLY public.bahrain_emergency_case_types
ORDER BY sort_order;
