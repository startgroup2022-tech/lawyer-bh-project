DO $$
DECLARE
  matching_rows integer;
BEGIN
  SELECT count(*)
    INTO matching_rows
  FROM ONLY public.bahrain_consultation_methods
  WHERE country_code = 'BH'
    AND code = 'whatsapp'
    AND name_ar = 'استشارة عبر الواتساب'
    AND price = 30.000;

  IF matching_rows <> 1 THEN
    RAISE EXCEPTION 'WhatsApp consultation name verification failed: expected 1 matching method, found %', matching_rows;
  END IF;
END $$;
