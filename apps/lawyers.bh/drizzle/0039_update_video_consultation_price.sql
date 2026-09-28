UPDATE ONLY public.bahrain_consultation_methods
SET
  price = 20.000,
  updated_at = now()
WHERE country_code = 'BH'
  AND code = 'video';

DO $$
DECLARE
  matching_rows integer;
BEGIN
  SELECT count(*)
    INTO matching_rows
  FROM ONLY public.bahrain_consultation_methods
  WHERE country_code = 'BH'
    AND code = 'video'
    AND price = 20.000;

  IF matching_rows <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one Bahrain video consultation method priced at 20 BHD, found %', matching_rows;
  END IF;
END $$;
