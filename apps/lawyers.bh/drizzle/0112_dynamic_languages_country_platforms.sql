-- Dynamic language catalogue and per-country product activation.
-- The legacy channel columns remain populated during the compatibility rollout.
CREATE TABLE IF NOT EXISTS public.platform_languages (
  code varchar(35) PRIMARY KEY
    CHECK (code ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  admin_name text NOT NULL CHECK (btrim(admin_name) <> ''),
  native_name text NOT NULL CHECK (btrim(native_name) <> ''),
  direction varchar(3) NOT NULL CHECK (direction IN ('rtl', 'ltr')),
  status varchar(10) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  updated_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.country_translations (
  country_code varchar(2) NOT NULL
    REFERENCES public.countries(code) ON DELETE CASCADE,
  language_code varchar(35) NOT NULL
    REFERENCES public.platform_languages(code),
  name text NOT NULL CHECK (btrim(name) <> ''),
  PRIMARY KEY (country_code, language_code)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.country_language_settings (
  country_code varchar(2) NOT NULL
    REFERENCES public.countries(code) ON DELETE CASCADE,
  language_code varchar(35) NOT NULL
    REFERENCES public.platform_languages(code),
  is_default boolean NOT NULL DEFAULT false,
  PRIMARY KEY (country_code, language_code)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS country_language_settings_one_default_idx
  ON public.country_language_settings (country_code)
  WHERE is_default = true;
--> statement-breakpoint
ALTER TABLE public.country_channel_settings
  ADD COLUMN IF NOT EXISTS lawyers_platform_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legal_sos_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lawyers_platform_url text;
--> statement-breakpoint
ALTER TABLE public.country_channel_settings
  DROP CONSTRAINT IF EXISTS country_channel_lawyers_platform_url_https;
--> statement-breakpoint
ALTER TABLE public.country_channel_settings
  ADD CONSTRAINT country_channel_lawyers_platform_url_https
  CHECK (
    lawyers_platform_url IS NULL
    OR btrim(lawyers_platform_url) = ''
    OR lawyers_platform_url ~ '^https://'
  );
--> statement-breakpoint
-- Ensure countries added after the original channel migration also receive a row.
INSERT INTO public.country_channel_settings (
  code,
  app_enabled,
  website_enabled,
  updated_at
)
SELECT
  code,
  is_active AND tables_provisioned,
  is_active AND tables_provisioned,
  now()
FROM public.countries
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
UPDATE public.country_channel_settings
SET lawyers_platform_enabled = website_enabled,
    legal_sos_enabled = app_enabled,
    lawyers_platform_url = website_url,
    updated_at = now();
--> statement-breakpoint
INSERT INTO public.platform_languages (
  code,
  admin_name,
  native_name,
  direction,
  status
)
VALUES
  ('ar', 'Arabic', 'العربية', 'rtl', 'published'),
  ('en', 'English', 'English', 'ltr', 'published'),
  ('tr', 'Turkish', 'Türkçe', 'ltr', 'published')
ON CONFLICT (code) DO UPDATE SET
  admin_name = EXCLUDED.admin_name,
  native_name = EXCLUDED.native_name,
  direction = EXCLUDED.direction,
  status = 'published',
  updated_at = now();
--> statement-breakpoint
-- Preserve any valid locale already selected by a country. These fallback
-- labels make legacy catalogue entries recognizable until an administrator
-- replaces them with their preferred display names.
INSERT INTO public.platform_languages (
  code,
  admin_name,
  native_name,
  direction,
  status
)
SELECT DISTINCT
  lower(btrim(c.default_locale)),
  'Existing locale (' || lower(btrim(c.default_locale)) || ')',
  lower(btrim(c.default_locale)),
  CASE
    WHEN split_part(lower(btrim(c.default_locale)), '-', 1)
      IN ('ar', 'ckb', 'dv', 'fa', 'he', 'nqo', 'ps', 'sd', 'syr', 'ug', 'ur', 'yi')
      OR lower(btrim(c.default_locale))
        ~ '(^|-)(arab|hebr|adlm|rohg|nkoo|syrc|thaa|mand|samr)(-|$)'
      THEN 'rtl'
    ELSE 'ltr'
  END,
  'published'
FROM public.countries c
WHERE btrim(c.default_locale)
  ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.country_translations (country_code, language_code, name)
SELECT code, 'ar', name_ar
FROM public.countries
WHERE btrim(name_ar) <> ''
ON CONFLICT (country_code, language_code) DO UPDATE SET
  name = EXCLUDED.name;
--> statement-breakpoint
INSERT INTO public.country_translations (country_code, language_code, name)
SELECT code, 'en', name_en
FROM public.countries
WHERE btrim(name_en) <> ''
ON CONFLICT (country_code, language_code) DO UPDATE SET
  name = EXCLUDED.name;
--> statement-breakpoint
-- Arabic and English were already available to every existing country.
INSERT INTO public.country_language_settings (
  country_code,
  language_code,
  is_default
)
SELECT
  c.code,
  l.code,
  false
FROM public.countries c
CROSS JOIN public.platform_languages l
WHERE l.code IN ('ar', 'en')
ON CONFLICT (country_code, language_code) DO NOTHING;
--> statement-breakpoint
-- Preserve every valid published existing default, including locale variants.
INSERT INTO public.country_language_settings (
  country_code,
  language_code,
  is_default
)
SELECT
  c.code,
  l.code,
  false
FROM public.countries c
JOIN public.platform_languages l
  ON l.code = lower(btrim(c.default_locale))
 AND l.status = 'published'
ON CONFLICT (country_code, language_code) DO NOTHING;
--> statement-breakpoint
UPDATE public.country_language_settings
SET is_default = false
WHERE is_default = true;
--> statement-breakpoint
UPDATE public.country_language_settings cls
SET is_default = true
FROM public.countries c
WHERE cls.country_code = c.code
  AND cls.language_code = CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.platform_languages l
      WHERE l.code = lower(btrim(c.default_locale))
        AND l.status = 'published'
    ) THEN lower(btrim(c.default_locale))
    ELSE 'ar'
  END;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.country_language_settings_require_published()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  language_status varchar(10);
BEGIN
  -- Membership and status downgrade serialize on this same language row.
  -- If a downgrade holds the row first, this waits and then observes draft;
  -- if membership holds it first, the downgrade waits and sees membership.
  SELECT l.status
  INTO language_status
  FROM public.platform_languages l
  WHERE l.code = NEW.language_code
  FOR UPDATE;

  IF language_status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'Country language % must be published before enablement',
      NEW.language_code;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER country_language_settings_require_published_trigger
BEFORE INSERT OR UPDATE OF language_code
ON public.country_language_settings
FOR EACH ROW
EXECUTE FUNCTION public.country_language_settings_require_published();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.platform_languages_prevent_used_downgrade()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'published'
     AND NEW.status = 'draft'
     AND EXISTS (
       SELECT 1
       FROM public.country_language_settings cls
       WHERE cls.language_code = OLD.code
     ) THEN
    RAISE EXCEPTION 'Published language % is enabled for one or more countries',
      OLD.code;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER platform_languages_prevent_used_downgrade_trigger
BEFORE UPDATE OF status
ON public.platform_languages
FOR EACH ROW
EXECUTE FUNCTION public.platform_languages_prevent_used_downgrade();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.activate_country_platform(
  p_code varchar,
  p_platform text
)
RETURNS TABLE (
  country_code varchar(2),
  platform text,
  enabled boolean,
  tables_provisioned boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_code varchar(2) := upper(btrim(p_code));
  country_ready boolean;
BEGIN
  IF p_platform NOT IN ('lawyers', 'legal_sos') THEN
    RAISE EXCEPTION 'Unsupported country platform: %', p_platform;
  END IF;

  SELECT c.tables_provisioned
  INTO country_ready
  FROM public.countries c
  WHERE c.code = normalized_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown country code: %', normalized_code;
  END IF;

  IF NOT country_ready THEN
    -- This transition is the supported entry point for all provisioning hooks.
    UPDATE public.countries
    SET is_active = true
    WHERE code = normalized_code;
  END IF;

  INSERT INTO public.country_channel_settings (
    code,
    app_enabled,
    website_enabled,
    lawyers_platform_enabled,
    legal_sos_enabled,
    updated_at
  )
  VALUES (
    normalized_code,
    p_platform = 'legal_sos',
    p_platform = 'lawyers',
    p_platform = 'lawyers',
    p_platform = 'legal_sos',
    now()
  )
  ON CONFLICT (code) DO UPDATE SET
    lawyers_platform_enabled = CASE
      WHEN p_platform = 'lawyers' THEN true
      ELSE country_channel_settings.lawyers_platform_enabled
    END,
    legal_sos_enabled = CASE
      WHEN p_platform = 'legal_sos' THEN true
      ELSE country_channel_settings.legal_sos_enabled
    END,
    website_enabled = CASE
      WHEN p_platform = 'lawyers' THEN true
      ELSE country_channel_settings.website_enabled
    END,
    app_enabled = CASE
      WHEN p_platform = 'legal_sos' THEN true
      ELSE country_channel_settings.app_enabled
    END,
    updated_at = now();

  RETURN QUERY
  SELECT
    c.code,
    p_platform,
    CASE
      WHEN p_platform = 'lawyers' THEN s.lawyers_platform_enabled
      ELSE s.legal_sos_enabled
    END,
    c.tables_provisioned
  FROM public.countries c
  JOIN public.country_channel_settings s ON s.code = c.code
  WHERE c.code = normalized_code;
END;
$$;
