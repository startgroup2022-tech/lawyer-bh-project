UPDATE ONLY public.bahrain_consultation_methods
SET
  price = CASE code
    WHEN 'whatsapp' THEN 30.000
    WHEN 'phone' THEN 30.000
    WHEN 'video' THEN 35.000
    WHEN 'office' THEN 45.000
  END,
  updated_at = now()
WHERE country_code = 'BH'
  AND code IN ('whatsapp', 'phone', 'video', 'office');

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
    RAISE EXCEPTION 'Expected exactly four updated Bahrain consultation methods, found %', matching_rows;
  END IF;
END $$;
