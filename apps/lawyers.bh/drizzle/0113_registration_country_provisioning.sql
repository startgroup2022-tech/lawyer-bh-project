CREATE OR REPLACE FUNCTION public.ensure_registration_country_tables(
  p_country_code text,
  p_table_prefix text,
  p_name_ar text,
  p_name_en text,
  p_phone_code text,
  p_currency_code text,
  p_default_locale text
) RETURNS SETOF public.countries
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_country_code text := upper(trim(p_country_code));
  table_prefix text := lower(trim(p_table_prefix));
  country_row public.countries%ROWTYPE;
BEGIN
  IF normalized_country_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'Invalid country code';
  END IF;

  IF table_prefix !~ '^[a-z][a-z0-9_]{1,15}$' THEN
    RAISE EXCEPTION 'Invalid country table prefix';
  END IF;

  IF upper(trim(p_currency_code)) !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Invalid country currency';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('registration-country:' || normalized_country_code, 0)
  );

  INSERT INTO public.countries (
    code,
    table_prefix,
    name_ar,
    name_en,
    phone_code,
    currency_code,
    default_locale,
    is_active, tables_provisioned
  ) VALUES (
    normalized_country_code,
    table_prefix,
    trim(p_name_ar),
    trim(p_name_en),
    NULLIF(trim(p_phone_code), ''),
    upper(trim(p_currency_code)),
    lower(trim(p_default_locale)),
    false, false
  )
  ON CONFLICT (code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    phone_code = COALESCE(EXCLUDED.phone_code, public.countries.phone_code),
    currency_code = EXCLUDED.currency_code,
    default_locale = EXCLUDED.default_locale,
    updated_at = now();

  SELECT *
  INTO country_row
  FROM public.countries
  WHERE code = normalized_country_code
  FOR UPDATE;

  IF country_row.table_prefix <> table_prefix THEN
    RAISE EXCEPTION 'Country table prefix mismatch';
  END IF;

  IF NOT country_row.tables_provisioned THEN
    PERFORM public.provision_country_tables(normalized_country_code, table_prefix);

    UPDATE public.countries
    SET tables_provisioned = true,
        provisioned_at = COALESCE(provisioned_at, now()),
        updated_at = now()
    WHERE code = normalized_country_code
    RETURNING * INTO country_row;
  END IF;

  RETURN NEXT country_row;
END;
$$;
