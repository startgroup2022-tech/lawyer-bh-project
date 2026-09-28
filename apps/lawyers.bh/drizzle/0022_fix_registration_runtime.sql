BEGIN;

-- The registration form no longer collects working hours. Make the column
-- nullable in every country lawyer table that has already been provisioned.
DO $$
DECLARE
  country_record RECORD;
  lawyers_table_name TEXT;
BEGIN
  FOR country_record IN
    SELECT table_prefix
    FROM public.countries
    WHERE tables_provisioned = true
  LOOP
    lawyers_table_name := country_record.table_prefix || '_lawyers';

    IF to_regclass(format('public.%I', lawyers_table_name)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN working_hours DROP NOT NULL',
        lawyers_table_name
      );

      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN working_hours DROP DEFAULT',
        lawyers_table_name
      );

      RAISE NOTICE 'working_hours is now nullable in public.%',
        lawyers_table_name;
    END IF;
  END LOOP;
END
$$;

COMMIT;
