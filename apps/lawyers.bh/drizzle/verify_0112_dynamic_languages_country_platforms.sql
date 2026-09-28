DO $$
DECLARE
  country_record record;
BEGIN
  IF (
    SELECT count(*)
    FROM public.platform_languages
    WHERE code IN ('ar', 'en', 'tr')
      AND status = 'published'
  ) <> 3 THEN
    RAISE EXCEPTION 'Published ar, en, and tr language seeds are missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.countries c
    LEFT JOIN public.country_translations ar
      ON ar.country_code = c.code AND ar.language_code = 'ar'
    LEFT JOIN public.country_translations en
      ON en.country_code = c.code AND en.language_code = 'en'
    WHERE ar.name IS DISTINCT FROM c.name_ar
       OR en.name IS DISTINCT FROM c.name_en
  ) THEN
    RAISE EXCEPTION 'Existing Arabic or English country names were not preserved';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.country_channel_settings
    WHERE lawyers_platform_enabled IS DISTINCT FROM website_enabled
       OR legal_sos_enabled IS DISTINCT FROM app_enabled
       OR lawyers_platform_url IS DISTINCT FROM website_url
  ) THEN
    RAISE EXCEPTION 'Legacy channel settings were not backfilled safely';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.country_language_settings cls
    JOIN public.platform_languages l ON l.code = cls.language_code
    WHERE l.status IS DISTINCT FROM 'published'
  ) THEN
    RAISE EXCEPTION 'A country has an unpublished language membership';
  END IF;

  IF EXISTS (
    SELECT country_code
    FROM public.country_language_settings
    WHERE is_default = true
    GROUP BY country_code
    HAVING count(*) <> 1
  ) OR EXISTS (
    SELECT 1
    FROM public.countries c
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.country_language_settings cls
      JOIN public.platform_languages l ON l.code = cls.language_code
      WHERE cls.country_code = c.code
        AND cls.is_default = true
        AND l.status = 'published'
    )
  ) THEN
    RAISE EXCEPTION 'Each country must have exactly one published default language';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.countries c
    JOIN public.country_language_settings cls
      ON cls.country_code = c.code AND cls.is_default = true
    WHERE lower(btrim(c.default_locale))
      ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'
      AND cls.language_code IS DISTINCT FROM lower(btrim(c.default_locale))
  ) THEN
    RAISE EXCEPTION 'A valid country default locale was not preserved';
  END IF;

  IF to_regprocedure('public.activate_country_platform(character varying,text)') IS NULL THEN
    RAISE EXCEPTION 'activate_country_platform function is missing';
  END IF;

  IF to_regprocedure('public.country_language_settings_require_published()') IS NULL
     OR to_regprocedure('public.platform_languages_prevent_used_downgrade()') IS NULL THEN
    RAISE EXCEPTION 'Published language invariant triggers are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'country_language_settings_require_published_trigger'
      AND NOT tgisinternal
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'platform_languages_prevent_used_downgrade_trigger'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Published language invariant triggers are not installed';
  END IF;

  FOR country_record IN SELECT code FROM public.countries LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.country_language_settings
      WHERE country_code = country_record.code
    ) THEN
      RAISE EXCEPTION 'Country % has no enabled language', country_record.code;
    END IF;
  END LOOP;
END $$;
