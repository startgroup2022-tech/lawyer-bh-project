-- Multi-country physical table provisioning.
-- Bahrain tables are the parent tables. Every active country gets its own
-- inherited child tables (for example saudi_lawyers and saudi_booking_requests).
-- Queries against the Bahrain parent tables include child-country rows unless
-- the SQL query uses ONLY or filters by country_code.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Rename the current Bahrain operational tables. The TypeScript export names
-- stay unchanged, so most application code does not need to be rewritten.
DO $$
BEGIN
  IF to_regclass('public.consent_log') IS NOT NULL
     AND to_regclass('public.bahrain_consent_log') IS NULL THEN
    ALTER TABLE public.consent_log RENAME TO bahrain_consent_log;
  END IF;

  IF to_regclass('public.lawyers_meta') IS NOT NULL
     AND to_regclass('public.bahrain_lawyers') IS NULL THEN
    ALTER TABLE public.lawyers_meta RENAME TO bahrain_lawyers;
  END IF;

  IF to_regclass('public.advocate_shifts') IS NOT NULL
     AND to_regclass('public.bahrain_advocate_shifts') IS NULL THEN
    ALTER TABLE public.advocate_shifts RENAME TO bahrain_advocate_shifts;
  END IF;

  IF to_regclass('public.lawyer_push_subscriptions') IS NOT NULL
     AND to_regclass('public.bahrain_lawyer_push_subscriptions') IS NULL THEN
    ALTER TABLE public.lawyer_push_subscriptions RENAME TO bahrain_lawyer_push_subscriptions;
  END IF;

  IF to_regclass('public.emergency_requests') IS NOT NULL
     AND to_regclass('public.bahrain_emergency_requests') IS NULL THEN
    ALTER TABLE public.emergency_requests RENAME TO bahrain_emergency_requests;
  END IF;

  IF to_regclass('public.lawyer_agreements') IS NOT NULL
     AND to_regclass('public.bahrain_lawyer_agreements') IS NULL THEN
    ALTER TABLE public.lawyer_agreements RENAME TO bahrain_lawyer_agreements;
  END IF;

  IF to_regclass('public.legal_case_categories') IS NOT NULL
     AND to_regclass('public.bahrain_legal_case_categories') IS NULL THEN
    ALTER TABLE public.legal_case_categories RENAME TO bahrain_legal_case_categories;
  END IF;

  IF to_regclass('public.legal_cases') IS NOT NULL
     AND to_regclass('public.bahrain_legal_cases') IS NULL THEN
    ALTER TABLE public.legal_cases RENAME TO bahrain_legal_cases;
  END IF;

  IF to_regclass('public.lawyer_legal_cases') IS NOT NULL
     AND to_regclass('public.bahrain_lawyer_legal_cases') IS NULL THEN
    ALTER TABLE public.lawyer_legal_cases RENAME TO bahrain_lawyer_legal_cases;
  END IF;

  IF to_regclass('public.booking_requests') IS NOT NULL
     AND to_regclass('public.bahrain_booking_requests') IS NULL THEN
    ALTER TABLE public.booking_requests RENAME TO bahrain_booking_requests;
  END IF;

  IF to_regclass('public.booking_reviews') IS NOT NULL
     AND to_regclass('public.bahrain_booking_reviews') IS NULL THEN
    ALTER TABLE public.booking_reviews RENAME TO bahrain_booking_reviews;
  END IF;
END $$;

-- 2) Every country-scoped table carries its country code. Existing data is BH.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'bahrain_consent_log',
    'bahrain_lawyers',
    'bahrain_advocate_shifts',
    'bahrain_lawyer_push_subscriptions',
    'bahrain_emergency_requests',
    'bahrain_lawyer_agreements',
    'bahrain_legal_case_categories',
    'bahrain_legal_cases',
    'bahrain_lawyer_legal_cases',
    'bahrain_booking_requests',
    'bahrain_booking_reviews'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NULL THEN
      RAISE EXCEPTION 'Required Bahrain template table % is missing', table_name;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS country_code varchar(2)',
      table_name
    );
    EXECUTE format(
      'UPDATE ONLY public.%I SET country_code = ''BH'' WHERE country_code IS NULL',
      table_name
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN country_code SET DEFAULT ''BH''',
      table_name
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN country_code SET NOT NULL',
      table_name
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (country_code)',
      table_name || '_country_code_idx',
      table_name
    );
  END LOOP;
END $$;

-- Country-specific membership number sequences.
DO $$
BEGIN
  IF to_regclass('public.lawyers_membership_no_seq') IS NOT NULL
     AND to_regclass('public.bahrain_lawyers_membership_no_seq') IS NULL THEN
    ALTER SEQUENCE public.lawyers_membership_no_seq
      RENAME TO bahrain_lawyers_membership_no_seq;
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.bahrain_lawyers_membership_no_seq
  START WITH 1001;

SELECT setval(
  'public.bahrain_lawyers_membership_no_seq',
  GREATEST(
    COALESCE((
      SELECT max(
        NULLIF(regexp_replace(membership_no, '[^0-9]', '', 'g'), '')::bigint
      )
      FROM ONLY public.bahrain_lawyers
    ), 1000),
    1000
  ),
  true
);

-- Keep the existing booking-name resolver country-aware. The original trigger
-- remains attached after the Bahrain table rename; child tables receive the same
-- trigger when they are provisioned.
CREATE OR REPLACE FUNCTION public.fill_booking_request_selected_lawyer_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  raw_name text;
  normalized_name text;
  matched_lawyer_id uuid;
  matched_lawyer_name text;
BEGIN
  IF NEW.assignment_mode <> 'lawyer' OR NEW.selected_lawyer_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  raw_name := coalesce(trim(NEW.selected_lawyer_name), '');
  IF raw_name = '' THEN
    RETURN NEW;
  END IF;

  normalized_name := lower(raw_name);
  normalized_name := regexp_replace(
    normalized_name,
    '^(المستشار|المحامي|الأستاذ|الاستاذ|دكتور|د\.?|advocate|lawyer|consultant|dr\.?)\s+',
    '',
    'i'
  );
  normalized_name := regexp_replace(normalized_name, '\s+-\s+.*$', '', 'g');
  normalized_name := regexp_replace(normalized_name, '\([^)]*\)', '', 'g');
  normalized_name := regexp_replace(trim(normalized_name), '\s+', ' ', 'g');

  IF normalized_name = '' THEN
    RETURN NEW;
  END IF;

  SELECT
    lm.id,
    coalesce(nullif(lm.full_name_ar, ''), nullif(lm.full_name_en, ''), nullif(lm.email, ''), lm.id::text)
  INTO matched_lawyer_id, matched_lawyer_name
  FROM public.bahrain_lawyers lm
  WHERE lm.country_code = NEW.country_code
    AND lm.is_active = true
    AND lm.status = 'approved'
    AND (
      lower(coalesce(lm.full_name_ar, '')) = normalized_name
      OR lower(coalesce(lm.full_name_en, '')) = normalized_name
      OR lower(coalesce(lm.email, '')) = normalized_name
      OR lower(coalesce(lm.full_name_ar, '')) ilike '%' || normalized_name || '%'
      OR lower(coalesce(lm.full_name_en, '')) ilike '%' || normalized_name || '%'
      OR normalized_name ilike '%' || lower(coalesce(lm.full_name_ar, '')) || '%'
      OR normalized_name ilike '%' || lower(coalesce(lm.full_name_en, '')) || '%'
    )
  ORDER BY
    CASE
      WHEN lower(coalesce(lm.full_name_ar, '')) = normalized_name THEN 1
      WHEN lower(coalesce(lm.full_name_en, '')) = normalized_name THEN 2
      WHEN lower(coalesce(lm.email, '')) = normalized_name THEN 3
      ELSE 4
    END,
    lm.created_at DESC
  LIMIT 1;

  IF matched_lawyer_id IS NOT NULL THEN
    NEW.selected_lawyer_id := matched_lawyer_id;
    NEW.selected_lawyer_name := coalesce(nullif(NEW.selected_lawyer_name, ''), matched_lawyer_name);
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Central country switch. Deactivating a country never drops its tables/data.
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(2) NOT NULL,
  table_prefix varchar(16) NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  phone_code varchar(8),
  currency_code varchar(3) NOT NULL,
  default_locale varchar(5) NOT NULL DEFAULT 'ar',
  is_active boolean NOT NULL DEFAULT false,
  tables_provisioned boolean NOT NULL DEFAULT false,
  provisioned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT countries_code_format_check CHECK (code ~ '^[A-Z]{2}$'),
  CONSTRAINT countries_table_prefix_format_check
    CHECK (table_prefix ~ '^[a-z][a-z0-9_]{1,15}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS countries_code_unique_idx
  ON public.countries (code);
CREATE UNIQUE INDEX IF NOT EXISTS countries_table_prefix_unique_idx
  ON public.countries (table_prefix);
CREATE INDEX IF NOT EXISTS countries_active_idx
  ON public.countries (is_active);

-- Helpers used by the provisioning function.
CREATE OR REPLACE FUNCTION public.country_constraint_exists(
  p_table_name text,
  p_constraint_name text
) RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = p_table_name
      AND c.conname = p_constraint_name
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_country_primary_key(
  p_table_name text
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  constraint_name text := left(p_table_name || '_pkey', 63);
BEGIN
  IF NOT public.country_constraint_exists(p_table_name, constraint_name) THEN
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I PRIMARY KEY (id)',
      p_table_name,
      constraint_name
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_country_foreign_key(
  p_table_name text,
  p_constraint_name text,
  p_column_name text,
  p_reference_table text,
  p_on_delete text DEFAULT 'NO ACTION'
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_on_delete NOT IN ('NO ACTION', 'CASCADE', 'SET NULL', 'RESTRICT') THEN
    RAISE EXCEPTION 'Unsupported ON DELETE action: %', p_on_delete;
  END IF;

  IF NOT public.country_constraint_exists(p_table_name, p_constraint_name) THEN
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE %s',
      p_table_name,
      left(p_constraint_name, 63),
      p_column_name,
      p_reference_table,
      p_on_delete
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_country_check(
  p_table_name text,
  p_constraint_name text,
  p_country_code text
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.country_constraint_exists(p_table_name, p_constraint_name) THEN
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (country_code = %L)',
      p_table_name,
      left(p_constraint_name, 63),
      p_country_code
    );
  END IF;
END;
$$;

-- 4) Creates the complete table family for one country.
CREATE OR REPLACE FUNCTION public.provision_country_tables(
  p_country_code text,
  p_table_prefix text
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  country_code text := upper(trim(p_country_code));
  table_prefix text := lower(trim(p_table_prefix));
  suffix text;
  parent_table text;
  child_table text;
  table_suffixes text[] := ARRAY[
    'consent_log',
    'lawyers',
    'advocate_shifts',
    'lawyer_push_subscriptions',
    'emergency_requests',
    'lawyer_agreements',
    'legal_case_categories',
    'legal_cases',
    'lawyer_legal_cases',
    'booking_requests',
    'booking_reviews'
  ];
BEGIN
  IF country_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'Invalid country code: %', country_code;
  END IF;

  IF table_prefix !~ '^[a-z][a-z0-9_]{1,15}$' THEN
    RAISE EXCEPTION 'Invalid table prefix: %', table_prefix;
  END IF;

  IF country_code = 'BH' OR table_prefix = 'bahrain' THEN
    IF country_code <> 'BH' OR table_prefix <> 'bahrain' THEN
      RAISE EXCEPTION 'The bahrain prefix is reserved for BH';
    END IF;
    RETURN;
  END IF;

  EXECUTE format(
    'CREATE SEQUENCE IF NOT EXISTS public.%I START WITH 1001',
    table_prefix || '_lawyers_membership_no_seq'
  );

  -- Create every physical child table and attach it to the Bahrain template.
  FOREACH suffix IN ARRAY table_suffixes
  LOOP
    parent_table := 'bahrain_' || suffix;
    child_table := table_prefix || '_' || suffix;

    IF to_regclass('public.' || parent_table) IS NULL THEN
      RAISE EXCEPTION 'Parent table % is missing', parent_table;
    END IF;

    IF to_regclass('public.' || child_table) IS NULL THEN
      EXECUTE format(
        'CREATE TABLE public.%I () INHERITS (public.%I)',
        child_table,
        parent_table
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
        AND parent.relname = parent_table
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I INHERIT public.%I',
        child_table,
        parent_table
      );
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN country_code SET DEFAULT %L',
      child_table,
      country_code
    );

    PERFORM public.ensure_country_check(
      child_table,
      left(child_table || '_country_code_check', 63),
      country_code
    );

    PERFORM public.ensure_country_primary_key(child_table);

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (country_code)',
      left(child_table || '_country_code_idx', 63),
      child_table
    );
  END LOOP;

  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_fill_booking_request_selected_lawyer_id ON public.%I',
    table_prefix || '_booking_requests'
  );
  EXECUTE format(
    'CREATE TRIGGER trg_fill_booking_request_selected_lawyer_id BEFORE INSERT OR UPDATE OF assignment_mode, selected_lawyer_name, selected_lawyer_id ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fill_booking_request_selected_lawyer_id()',
    table_prefix || '_booking_requests'
  );

  -- Per-country uniqueness and query indexes.
  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (registration_no)', left(table_prefix || '_lawyers_registration_no_uidx', 63), table_prefix || '_lawyers');
  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (membership_no) WHERE membership_no IS NOT NULL', left(table_prefix || '_lawyers_membership_no_uidx', 63), table_prefix || '_lawyers');
  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (lower(email)) WHERE email IS NOT NULL', left(table_prefix || '_lawyers_email_uidx', 63), table_prefix || '_lawyers');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (phone)', left(table_prefix || '_lawyers_phone_idx', 63), table_prefix || '_lawyers');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (status)', left(table_prefix || '_lawyers_status_idx', 63), table_prefix || '_lawyers');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (subscription_type)', left(table_prefix || '_lawyers_subscription_type_idx', 63), table_prefix || '_lawyers');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (is_active)', left(table_prefix || '_lawyers_active_idx', 63), table_prefix || '_lawyers');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (created_at)', left(table_prefix || '_lawyers_created_idx', 63), table_prefix || '_lawyers');

  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (id_number)', left(table_prefix || '_consent_id_number_idx', 63), table_prefix || '_consent_log');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (role)', left(table_prefix || '_consent_role_idx', 63), table_prefix || '_consent_log');

  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (advocate_id)', left(table_prefix || '_shifts_advocate_idx', 63), table_prefix || '_advocate_shifts');
  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (endpoint)', left(table_prefix || '_push_endpoint_uidx', 63), table_prefix || '_lawyer_push_subscriptions');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (advocate_id)', left(table_prefix || '_push_advocate_idx', 63), table_prefix || '_lawyer_push_subscriptions');

  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (case_ref)', left(table_prefix || '_emergency_case_ref_uidx', 63), table_prefix || '_emergency_requests');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (service_status)', left(table_prefix || '_emergency_status_idx', 63), table_prefix || '_emergency_requests');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (created_at)', left(table_prefix || '_emergency_created_idx', 63), table_prefix || '_emergency_requests');

  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (reference)', left(table_prefix || '_agreements_reference_uidx', 63), table_prefix || '_lawyer_agreements');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (status)', left(table_prefix || '_agreements_status_idx', 63), table_prefix || '_lawyer_agreements');

  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (key)', left(table_prefix || '_categories_key_uidx', 63), table_prefix || '_legal_case_categories');
  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (key)', left(table_prefix || '_legal_cases_key_uidx', 63), table_prefix || '_legal_cases');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (category_id)', left(table_prefix || '_legal_cases_category_idx', 63), table_prefix || '_legal_cases');

  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (lawyer_id, legal_case_id)', left(table_prefix || '_lawyer_cases_pair_uidx', 63), table_prefix || '_lawyer_legal_cases');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (lawyer_id)', left(table_prefix || '_lawyer_cases_lawyer_idx', 63), table_prefix || '_lawyer_legal_cases');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (legal_case_id)', left(table_prefix || '_lawyer_cases_case_idx', 63), table_prefix || '_lawyer_legal_cases');

  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (assigned_to_email)', left(table_prefix || '_booking_assigned_email_idx', 63), table_prefix || '_booking_requests');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (payment_status)', left(table_prefix || '_booking_payment_status_idx', 63), table_prefix || '_booking_requests');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (admin_status)', left(table_prefix || '_booking_admin_status_idx', 63), table_prefix || '_booking_requests');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (selected_lawyer_id)', left(table_prefix || '_booking_lawyer_idx', 63), table_prefix || '_booking_requests');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (created_at)', left(table_prefix || '_booking_created_idx', 63), table_prefix || '_booking_requests');

  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (booking_request_id)', left(table_prefix || '_reviews_booking_uidx', 63), table_prefix || '_booking_reviews');
  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (review_token_hash)', left(table_prefix || '_reviews_token_uidx', 63), table_prefix || '_booking_reviews');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (lawyer_id)', left(table_prefix || '_reviews_lawyer_idx', 63), table_prefix || '_booking_reviews');
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (status)', left(table_prefix || '_reviews_status_idx', 63), table_prefix || '_booking_reviews');

  -- Relationships stay inside the same country table family.
  PERFORM public.ensure_country_foreign_key(table_prefix || '_lawyers', left(table_prefix || '_lawyers_consent_fk', 63), 'consent_id', table_prefix || '_consent_log', 'NO ACTION');
  PERFORM public.ensure_country_foreign_key(table_prefix || '_advocate_shifts', left(table_prefix || '_shifts_advocate_fk', 63), 'advocate_id', table_prefix || '_lawyers', 'CASCADE');
  PERFORM public.ensure_country_foreign_key(table_prefix || '_lawyer_push_subscriptions', left(table_prefix || '_push_advocate_fk', 63), 'advocate_id', table_prefix || '_lawyers', 'CASCADE');
  PERFORM public.ensure_country_foreign_key(table_prefix || '_emergency_requests', left(table_prefix || '_emergency_consent_fk', 63), 'consent_id', table_prefix || '_consent_log', 'NO ACTION');
  PERFORM public.ensure_country_foreign_key(table_prefix || '_emergency_requests', left(table_prefix || '_emergency_lawyer_fk', 63), 'assigned_lawyer_id', table_prefix || '_lawyers', 'NO ACTION');
  PERFORM public.ensure_country_foreign_key(table_prefix || '_legal_cases', left(table_prefix || '_legal_cases_category_fk', 63), 'category_id', table_prefix || '_legal_case_categories', 'CASCADE');
  PERFORM public.ensure_country_foreign_key(table_prefix || '_lawyer_legal_cases', left(table_prefix || '_lawyer_cases_lawyer_fk', 63), 'lawyer_id', table_prefix || '_lawyers', 'CASCADE');
  PERFORM public.ensure_country_foreign_key(table_prefix || '_lawyer_legal_cases', left(table_prefix || '_lawyer_cases_case_fk', 63), 'legal_case_id', table_prefix || '_legal_cases', 'CASCADE');
  PERFORM public.ensure_country_foreign_key(table_prefix || '_booking_requests', left(table_prefix || '_booking_legal_case_fk', 63), 'legal_case_id', table_prefix || '_legal_cases', 'NO ACTION');
  PERFORM public.ensure_country_foreign_key(table_prefix || '_booking_requests', left(table_prefix || '_booking_lawyer_fk', 63), 'selected_lawyer_id', table_prefix || '_lawyers', 'NO ACTION');
  PERFORM public.ensure_country_foreign_key(table_prefix || '_booking_reviews', left(table_prefix || '_reviews_booking_fk', 63), 'booking_request_id', table_prefix || '_booking_requests', 'CASCADE');
  PERFORM public.ensure_country_foreign_key(table_prefix || '_booking_reviews', left(table_prefix || '_reviews_lawyer_fk', 63), 'lawyer_id', table_prefix || '_lawyers', 'SET NULL');

  -- Start a new country with the same category/case catalogue, but isolated rows.
  EXECUTE format(
    'INSERT INTO public.%I (id, country_code, key, name_ar, name_en, description_ar, description_en, sort_order, is_active, created_at, updated_at)
     SELECT id, %L, key, name_ar, name_en, description_ar, description_en, sort_order, is_active, created_at, updated_at
     FROM ONLY public.bahrain_legal_case_categories
     ON CONFLICT (id) DO NOTHING',
    table_prefix || '_legal_case_categories',
    country_code
  );

  EXECUTE format(
    'INSERT INTO public.%I (id, country_code, category_id, key, name_ar, name_en, description_ar, description_en, keywords_ar, keywords_en, sort_order, is_active, created_at, updated_at)
     SELECT id, %L, category_id, key, name_ar, name_en, description_ar, description_en, keywords_ar, keywords_en, sort_order, is_active, created_at, updated_at
     FROM ONLY public.bahrain_legal_cases
     ON CONFLICT (id) DO NOTHING',
    table_prefix || '_legal_cases',
    country_code
  );
END;
$$;

-- 5) Activating a country provisions its tables in the same transaction.
CREATE OR REPLACE FUNCTION public.countries_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.code := upper(trim(NEW.code));
  NEW.table_prefix := lower(trim(NEW.table_prefix));
  NEW.updated_at := now();

  IF TG_OP = 'UPDATE' THEN
    IF OLD.tables_provisioned
       AND NEW.table_prefix IS DISTINCT FROM OLD.table_prefix THEN
      RAISE EXCEPTION 'table_prefix cannot be changed after provisioning';
    END IF;

    IF OLD.tables_provisioned
       AND NEW.code IS DISTINCT FROM OLD.code THEN
      RAISE EXCEPTION 'country code cannot be changed after provisioning';
    END IF;

    IF NEW.is_active
       AND (OLD.is_active IS DISTINCT FROM true OR NOT NEW.tables_provisioned) THEN
      PERFORM public.provision_country_tables(NEW.code, NEW.table_prefix);
      NEW.tables_provisioned := true;
      NEW.provisioned_at := COALESCE(NEW.provisioned_at, now());
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.is_active THEN
    PERFORM public.provision_country_tables(NEW.code, NEW.table_prefix);
    NEW.tables_provisioned := true;
    NEW.provisioned_at := COALESCE(NEW.provisioned_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS countries_before_write_trigger ON public.countries;
CREATE TRIGGER countries_before_write_trigger
BEFORE INSERT OR UPDATE ON public.countries
FOR EACH ROW
EXECUTE FUNCTION public.countries_before_write();

-- 6) Initial catalogue. Only Bahrain starts active.
INSERT INTO public.countries
  (code, table_prefix, name_ar, name_en, phone_code, currency_code, default_locale, is_active, tables_provisioned, provisioned_at)
VALUES
  ('BH', 'bahrain', 'البحرين', 'Bahrain', '+973', 'BHD', 'ar', true, true, now()),
  ('SA', 'saudi', 'السعودية', 'Saudi Arabia', '+966', 'SAR', 'ar', false, false, null),
  ('KW', 'kuwait', 'الكويت', 'Kuwait', '+965', 'KWD', 'ar', false, false, null),
  ('AE', 'uae', 'الإمارات', 'United Arab Emirates', '+971', 'AED', 'ar', false, false, null),
  ('QA', 'qatar', 'قطر', 'Qatar', '+974', 'QAR', 'ar', false, false, null),
  ('OM', 'oman', 'عُمان', 'Oman', '+968', 'OMR', 'ar', false, false, null),
  ('IQ', 'iraq', 'العراق', 'Iraq', '+964', 'IQD', 'ar', false, false, null),
  ('TR', 'turkey', 'تركيا', 'Turkey', '+90', 'TRY', 'tr', false, false, null),
  ('EG', 'egypt', 'مصر', 'Egypt', '+20', 'EGP', 'ar', false, false, null)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  phone_code = EXCLUDED.phone_code,
  currency_code = EXCLUDED.currency_code,
  default_locale = EXCLUDED.default_locale,
  updated_at = now();