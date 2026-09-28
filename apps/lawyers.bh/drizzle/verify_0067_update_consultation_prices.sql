DO $$
DECLARE
  matching_rows integer;
BEGIN
  SELECT count(*)
    INTO matching_rows
  FROM ONLY public.bahrain_consultation_methods
  WHERE country_code = 'BH'
    AND (
      (code = 'whatsapp' AND price = 30.000)
      OR (code = 'phone' AND price = 30.000)
      OR (code = 'video' AND price = 35.000)
      OR (code = 'office' AND price = 45.000)
    );

  IF matching_rows <> 4 THEN
    RAISE EXCEPTION 'Consultation price verification failed: expected 4 matching methods, found %', matching_rows;
  END IF;
END $$;
