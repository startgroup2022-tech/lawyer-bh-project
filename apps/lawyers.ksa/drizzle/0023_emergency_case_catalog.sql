-- Database-backed Legal SOS catalogue.
-- The catalogue is the source of truth for names, descriptions and prices
-- used by the website, mobile application and payment API.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TYPE public.emergency_case_type
  ADD VALUE IF NOT EXISTS 'emergency_consultation';

CREATE TABLE IF NOT EXISTS public.bahrain_emergency_case_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  slug text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text NOT NULL,
  description_en text NOT NULL,
  action_type_ar text NOT NULL,
  action_type_en text NOT NULL,
  price numeric(10, 3) NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'BHD',
  icon_key varchar(64) NOT NULL DEFAULT 'shield-alert',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bahrain_emergency_case_types_slug_format_check
    CHECK (slug ~ '^emergency_[a-z0-9_]+$'),
  CONSTRAINT bahrain_emergency_case_types_price_check
    CHECK (price > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS bahrain_emergency_case_types_slug_uidx
  ON public.bahrain_emergency_case_types (slug);
CREATE INDEX IF NOT EXISTS bahrain_emergency_case_types_active_sort_idx
  ON public.bahrain_emergency_case_types (is_active, sort_order);
CREATE INDEX IF NOT EXISTS bahrain_emergency_case_types_country_code_idx
  ON public.bahrain_emergency_case_types (country_code);

INSERT INTO public.bahrain_emergency_case_types (
  country_code,
  slug,
  name_ar,
  name_en,
  description_ar,
  description_en,
  action_type_ar,
  action_type_en,
  price,
  currency_code,
  icon_key,
  sort_order,
  is_active
)
VALUES
  (
    'BH',
    'emergency_arrest',
    'القبض والتوقيف والتحقيقات',
    'Arrest, Detention & Investigations',
    'القبض، التوقيف، الحضور في مراكز الشرطة أو النيابة العامة.',
    'Arrest by police, detention, presence at a police station or Public Prosecution.',
    'حضور ميداني',
    'Field presence',
    150.000,
    'BHD',
    'badge-alert',
    10,
    true
  ),
  (
    'BH',
    'emergency_search',
    'تفتيش المساكن أو المقرات',
    'Search & Seizure',
    'تفتيش المسكن أو المكتب أو المقر التجاري.',
    'Search of a residence, office or commercial premises.',
    'حضور ميداني',
    'Field presence',
    120.000,
    'BHD',
    'search',
    20,
    true
  ),
  (
    'BH',
    'emergency_travel_ban',
    'المنع من السفر والحجز التحفظي',
    'Travel Ban / Precautionary Attachment',
    'إجراءات المنع من السفر والحجز التحفظي المفاجئ.',
    'Sudden travel ban, precautionary attachment or seizure orders.',
    'إجراء قضائي مستعجل',
    'Legal injunction',
    100.000,
    'BHD',
    'plane',
    30,
    true
  ),
  (
    'BH',
    'emergency_evidence',
    'إثبات الحالة المستعجلة',
    'Urgent Evidence Preservation',
    'تلفيات، طرد، معاينة أضرار تستلزم إثباتاً عاجلاً.',
    'Damage, eviction or on-site inspection requiring immediate proof.',
    'معاينة ميدانية',
    'Site inspection',
    100.000,
    'BHD',
    'shield-alert',
    40,
    true
  ),
  (
    'BH',
    'emergency_report',
    'البلاغات الجنائية والشكاوى العاجلة',
    'Urgent Criminal Report',
    'تقديم أو متابعة بلاغ جنائي أو شكوى عاجلة.',
    'Filing or following up an urgent criminal complaint or report.',
    'تقديم ومتابعة',
    'Filing & follow-up',
    100.000,
    'BHD',
    'file-warning',
    50,
    true
  ),
  (
    'BH',
    'emergency_consultation',
    'استشارة قانونية طارئة',
    'Emergency Legal Consultation',
    'استشارة قانونية فورية للحالات الطارئة التي تتطلب توجيهاً سريعاً.',
    'Immediate legal advice for urgent situations requiring fast guidance.',
    'استشارة عاجلة',
    'Urgent consultation',
    30.000,
    'BHD',
    'message-circle-question',
    60,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  action_type_ar = EXCLUDED.action_type_ar,
  action_type_en = EXCLUDED.action_type_en,
  price = EXCLUDED.price,
  currency_code = EXCLUDED.currency_code,
  icon_key = EXCLUDED.icon_key,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Provision a country-specific physical catalogue table and copy the Bahrain
-- catalogue as a starting point. Prices can then be changed per country.
CREATE OR REPLACE FUNCTION public.provision_country_emergency_case_types(
  p_country_code text,
  p_table_prefix text
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  country_code text := upper(trim(p_country_code));
  table_prefix text := lower(trim(p_table_prefix));
  child_table text := table_prefix || '_emergency_case_types';
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
      'CREATE TABLE public.%I () INHERITS (public.bahrain_emergency_case_types)',
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
      AND parent.relname = 'bahrain_emergency_case_types'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.%I INHERIT public.bahrain_emergency_case_types',
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
    'CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (slug)',
    left(child_table || '_slug_uidx', 63),
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
       id, country_code, slug, name_ar, name_en, description_ar,
       description_en, action_type_ar, action_type_en, price,
       currency_code, icon_key, sort_order, is_active, created_at, updated_at
     )
     SELECT
       gen_random_uuid(), %L, slug, name_ar, name_en, description_ar,
       description_en, action_type_ar, action_type_en, price,
       %L, icon_key, sort_order, is_active, now(), now()
     FROM ONLY public.bahrain_emergency_case_types
     ON CONFLICT (slug) DO NOTHING',
    child_table,
    country_code,
    country_currency
  );
END;
$$;

-- Existing provisioned countries receive the catalogue immediately.
DO $$
DECLARE
  country_row record;
BEGIN
  FOR country_row IN
    SELECT code, table_prefix
    FROM public.countries
    WHERE tables_provisioned = true
  LOOP
    PERFORM public.provision_country_emergency_case_types(
      country_row.code,
      country_row.table_prefix
    );
  END LOOP;
END $$;

-- Future country activation also provisions its SOS catalogue without having
-- to duplicate the large original country-provisioning function.
CREATE OR REPLACE FUNCTION public.countries_after_emergency_catalog_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_active = true AND NEW.tables_provisioned = true THEN
    PERFORM public.provision_country_emergency_case_types(
      NEW.code,
      NEW.table_prefix
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS countries_after_emergency_catalog_write_trigger
  ON public.countries;
CREATE TRIGGER countries_after_emergency_catalog_write_trigger
AFTER INSERT OR UPDATE OF is_active, tables_provisioned, table_prefix, code
ON public.countries
FOR EACH ROW
EXECUTE FUNCTION public.countries_after_emergency_catalog_write();
