-- Database-backed consultation-method catalogue.
-- This table is the source of truth for consultation names, prices and durations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.bahrain_consultation_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  code varchar(32) NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  price numeric(10, 3) NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'BHD',
  duration_minutes integer NOT NULL,
  icon_key varchar(64) NOT NULL DEFAULT 'phone',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bahrain_consultation_methods_code_check
    CHECK (code IN ('phone', 'video', 'office')),
  CONSTRAINT bahrain_consultation_methods_price_check
    CHECK (price > 0),
  CONSTRAINT bahrain_consultation_methods_duration_check
    CHECK (duration_minutes > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS bahrain_consultation_methods_code_uidx
  ON public.bahrain_consultation_methods (code);
CREATE INDEX IF NOT EXISTS bahrain_consultation_methods_active_sort_idx
  ON public.bahrain_consultation_methods (is_active, sort_order);
CREATE INDEX IF NOT EXISTS bahrain_consultation_methods_country_code_idx
  ON public.bahrain_consultation_methods (country_code);

INSERT INTO public.bahrain_consultation_methods (
  country_code,
  code,
  name_ar,
  name_en,
  price,
  currency_code,
  duration_minutes,
  icon_key,
  sort_order,
  is_active
)
VALUES
  ('BH', 'phone', 'مكالمة صوتية', 'Voice Call', 10.000, 'BHD', 15, 'phone', 10, true),
  ('BH', 'video', 'مكالمة فيديو', 'Video Call', 15.000, 'BHD', 20, 'video', 20, true),
  ('BH', 'office', 'زيارة المكتب', 'Office Visit', 25.000, 'BHD', 30, 'map-pin', 30, true)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  price = EXCLUDED.price,
  currency_code = EXCLUDED.currency_code,
  duration_minutes = EXCLUDED.duration_minutes,
  icon_key = EXCLUDED.icon_key,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Create a physical consultation-method table for every provisioned country.
CREATE OR REPLACE FUNCTION public.provision_country_consultation_methods(
  p_country_code text,
  p_table_prefix text
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  country_code text := upper(trim(p_country_code));
  table_prefix text := lower(trim(p_table_prefix));
  child_table text := table_prefix || '_consultation_methods';
  country_currency text;
BEGIN
  IF country_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'Invalid country code: %', country_code;
  END IF;

  IF table_prefix !~ '^[a-z][a-z0-9_]{1,15}$' THEN
    RAISE EXCEPTION 'Invalid table prefix: %', table_prefix;
  END IF;

  IF country_code = 'BH' AND table_prefix = 'bahrain' THEN
    RETURN;
  END IF;

  SELECT currency_code
  INTO country_currency
  FROM public.countries
  WHERE code = country_code
  LIMIT 1;

  country_currency := COALESCE(country_currency, 'BHD');

  IF to_regclass('public.' || child_table) IS NULL THEN
    EXECUTE format(
      'CREATE TABLE public.%I () INHERITS (public.bahrain_consultation_methods)',
      child_table
    );
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_inherits i
    JOIN pg_class child ON child.oid = i.inhrelid
    JOIN pg_class parent ON parent.oid = i.inhparent
    JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
    JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
    WHERE child_ns.nspname = 'public'
      AND parent_ns.nspname = 'public'
      AND child.relname = child_table
      AND parent.relname = 'bahrain_consultation_methods'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.%I INHERIT public.bahrain_consultation_methods',
      child_table
    );
  END IF;

  EXECUTE format(
    'ALTER TABLE public.%I ALTER COLUMN country_code SET DEFAULT %L',
    child_table,
    country_code
  );

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = child_table
      AND c.conname = left(child_table || '_country_code_check', 63)
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (country_code = %L)',
      child_table,
      left(child_table || '_country_code_check', 63),
      country_code
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = child_table
      AND c.contype = 'p'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I PRIMARY KEY (id)',
      child_table,
      left(child_table || '_pkey', 63)
    );
  END IF;

  EXECUTE format(
    'CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (code)',
    left(child_table || '_code_uidx', 63),
    child_table
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON public.%I (is_active, sort_order)',
    left(child_table || '_active_sort_idx', 63),
    child_table
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON public.%I (country_code)',
    left(child_table || '_country_code_idx', 63),
    child_table
  );

  EXECUTE format(
    'INSERT INTO public.%I (
       id, country_code, code, name_ar, name_en, price, currency_code,
       duration_minutes, icon_key, sort_order, is_active, created_at, updated_at
     )
     SELECT
       gen_random_uuid(), %L, code, name_ar, name_en, price, %L,
       duration_minutes, icon_key, sort_order, is_active, now(), now()
     FROM ONLY public.bahrain_consultation_methods
     ON CONFLICT (code) DO NOTHING',
    child_table,
    country_code,
    country_currency
  );
END;
$$;

DO $$
DECLARE
  country_row record;
BEGIN
  FOR country_row IN
    SELECT code, table_prefix
    FROM public.countries
    WHERE tables_provisioned = true
  LOOP
    PERFORM public.provision_country_consultation_methods(
      country_row.code,
      country_row.table_prefix
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.countries_after_consultation_catalog_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_active = true AND NEW.tables_provisioned = true THEN
    PERFORM public.provision_country_consultation_methods(
      NEW.code,
      NEW.table_prefix
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS countries_after_consultation_catalog_write_trigger
  ON public.countries;
CREATE TRIGGER countries_after_consultation_catalog_write_trigger
AFTER INSERT OR UPDATE OF is_active, tables_provisioned, table_prefix, code
ON public.countries
FOR EACH ROW
EXECUTE FUNCTION public.countries_after_consultation_catalog_write();
