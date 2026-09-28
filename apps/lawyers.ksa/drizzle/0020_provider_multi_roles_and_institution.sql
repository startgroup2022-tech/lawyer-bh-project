-- Multi-role provider registration + optional institution details.
-- Run this migration before deploying the updated /api/join route.

DO $$
DECLARE
  country_row RECORD;
  lawyers_table_name TEXT;
  subscription_types_index_name TEXT;
BEGIN
  FOR country_row IN
    SELECT table_prefix
    FROM public.countries
    WHERE tables_provisioned = true
  LOOP
    lawyers_table_name := country_row.table_prefix || '_lawyers';
    subscription_types_index_name :=
      lawyers_table_name || '_subscription_types_gin_idx';

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS subscription_types jsonb NOT NULL DEFAULT ''[]''::jsonb',
      lawyers_table_name
    );

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS cr_number text',
      lawyers_table_name
    );

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS institution_license_file_name text',
      lawyers_table_name
    );

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS institution_license_file_mime_type text',
      lawyers_table_name
    );

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS institution_license_file_url text',
      lawyers_table_name
    );

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS institution_license_file_blob_path text',
      lawyers_table_name
    );

    EXECUTE format(
      'UPDATE public.%I
       SET subscription_types = jsonb_build_array(subscription_type::text)
       WHERE subscription_types = ''[]''::jsonb
         AND subscription_type IS NOT NULL',
      lawyers_table_name
    );

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I USING GIN (subscription_types)',
      subscription_types_index_name,
      lawyers_table_name
    );
  END LOOP;
END
$$;
