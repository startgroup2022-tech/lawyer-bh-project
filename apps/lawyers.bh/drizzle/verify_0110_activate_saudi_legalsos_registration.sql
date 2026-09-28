DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.countries
    WHERE code = 'SA'
      AND is_active = true
      AND tables_provisioned = true
  ) THEN
    RAISE EXCEPTION 'Saudi Arabia is not active and provisioned';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.country_channel_settings
    WHERE code = 'SA'
      AND app_enabled = true
      AND website_enabled = false
  ) THEN
    RAISE EXCEPTION 'Saudi Arabia LegalSOS channel settings are invalid';
  END IF;
END $$;
