-- Run only against an empty disposable PostgreSQL database using psql -f.
\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE public.countries (code varchar(2) PRIMARY KEY, is_active boolean NOT NULL, tables_provisioned boolean NOT NULL);
INSERT INTO public.countries VALUES ('BH', true, true), ('SA', false, false), ('KW', true, false);
CREATE FUNCTION reject_country_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Visibility must not mutate or provision countries'; END;
$$;
CREATE TRIGGER protect_country BEFORE INSERT OR UPDATE OR DELETE ON public.countries
FOR EACH ROW EXECUTE FUNCTION reject_country_write();
\ir ../drizzle/0045_country_channel_settings.sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM country_channel_settings WHERE code='BH' AND app_enabled AND website_enabled)
    THEN RAISE EXCEPTION 'Existing availability was not preserved'; END IF;
  IF EXISTS (SELECT 1 FROM country_channel_settings WHERE code IN ('SA','KW') AND (app_enabled OR website_enabled))
    THEN RAISE EXCEPTION 'Unprovisioned country was enabled'; END IF;
END $$;
INSERT INTO country_channel_settings (code,app_enabled) VALUES ('SA',true)
ON CONFLICT (code) DO UPDATE SET app_enabled=EXCLUDED.app_enabled;
INSERT INTO country_channel_settings (code,website_enabled) VALUES ('JP',true);
UPDATE country_channel_settings SET background_url='https://images.example/sa.png' WHERE code='SA';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM country_channel_settings WHERE code='SA' AND app_enabled AND NOT website_enabled AND background_url IS NOT NULL)
    THEN RAISE EXCEPTION 'Independent app switch or background failed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM country_channel_settings WHERE code='JP' AND website_enabled AND NOT app_enabled)
    THEN RAISE EXCEPTION 'Independent website switch failed'; END IF;
END $$;
ROLLBACK;
\echo 'Country migration, preservation and independent switches passed; fixture rolled back.'
