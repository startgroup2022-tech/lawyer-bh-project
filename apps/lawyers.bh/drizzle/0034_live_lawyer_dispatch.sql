CREATE OR REPLACE FUNCTION public.ensure_live_lawyer_dispatch_columns(
  lawyers_table_name text,
  requests_table_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_regclass(format('public.%I', lawyers_table_name)) IS NULL
     OR to_regclass(format('public.%I', requests_table_name)) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format(
    'ALTER TABLE public.%I
       ADD COLUMN IF NOT EXISTS live_location jsonb,
       ADD COLUMN IF NOT EXISTS live_location_updated_at timestamptz,
       ADD COLUMN IF NOT EXISTS location_sharing_enabled boolean NOT NULL DEFAULT false',
    lawyers_table_name
  );

  EXECUTE format(
    'ALTER TABLE public.%I
       ADD COLUMN IF NOT EXISTS candidate_lawyer_id uuid,
       ADD COLUMN IF NOT EXISTS candidate_offered_at timestamptz,
       ADD COLUMN IF NOT EXISTS lawyer_response_deadline timestamptz,
       ADD COLUMN IF NOT EXISTS customer_approved_at timestamptz,
       ADD COLUMN IF NOT EXISTS excluded_lawyer_ids jsonb NOT NULL DEFAULT ''[]''::jsonb',
    requests_table_name
  );

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = format('public.%I', requests_table_name)::regclass
      AND conname = left(requests_table_name || '_candidate_lawyer_fk', 63)
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.%I
         ADD CONSTRAINT %I FOREIGN KEY (candidate_lawyer_id)
         REFERENCES public.%I(id) ON DELETE SET NULL',
      requests_table_name,
      left(requests_table_name || '_candidate_lawyer_fk', 63),
      lawyers_table_name
    );
  END IF;

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON public.%I
       (country_code, is_emergency_ready, location_sharing_enabled, live_location_updated_at)',
    left(lawyers_table_name || '_live_dispatch_idx', 63),
    lawyers_table_name
  );

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON public.%I
       (country_code, service_status, candidate_lawyer_id, lawyer_response_deadline)',
    left(requests_table_name || '_pending_dispatch_idx', 63),
    requests_table_name
  );
END;
$$;

DO $$
DECLARE
  country_record record;
BEGIN
  FOR country_record IN
    SELECT table_prefix
    FROM public.countries
    WHERE tables_provisioned = true
  LOOP
    PERFORM public.ensure_live_lawyer_dispatch_columns(
      country_record.table_prefix || '_lawyers',
      country_record.table_prefix || '_emergency_requests'
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.provision_live_lawyer_dispatch_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tables_provisioned = true THEN
    PERFORM public.ensure_live_lawyer_dispatch_columns(
      NEW.table_prefix || '_lawyers',
      NEW.table_prefix || '_emergency_requests'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_live_lawyer_dispatch_columns
  ON public.countries;

CREATE TRIGGER trg_provision_live_lawyer_dispatch_columns
AFTER INSERT OR UPDATE OF tables_provisioned, table_prefix
ON public.countries
FOR EACH ROW
EXECUTE FUNCTION public.provision_live_lawyer_dispatch_columns();
