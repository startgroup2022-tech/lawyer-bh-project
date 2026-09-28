BEGIN;

-- Emergency-mobile lawyers do not provide working hours. Keep the column for
-- web and legacy profiles, but allow it to be empty in every provisioned
-- country lawyer table.
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
    END IF;
  END LOOP;
END
$$;

COMMIT;
