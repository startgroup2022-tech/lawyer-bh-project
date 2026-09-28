UPDATE ONLY public.bahrain_consultation_methods
SET
  name_ar = 'استشارة عبر الواتساب',
  updated_at = now()
WHERE country_code = 'BH'
  AND code = 'whatsapp';

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
    RAISE EXCEPTION 'Expected exactly one renamed Bahrain WhatsApp consultation method, found %', matching_rows;
  END IF;
END $$;
