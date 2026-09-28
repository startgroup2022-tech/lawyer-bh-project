DO $$
BEGIN
  IF to_regprocedure(
    'public.ensure_registration_country_tables(text,text,text,text,text,text,text)'
  ) IS NULL THEN
    RAISE EXCEPTION 'Registration country provisioning function is missing';
  END IF;
END $$;
