UPDATE ONLY public.bahrain_consultation_methods
SET
  name_ar = 'استشارة عبر الواتساب (كتابية)',
  name_en = 'Written WhatsApp Consultation',
  price = 10.000,
  updated_at = now()
WHERE country_code = 'BH'
  AND code = 'whatsapp';

UPDATE ONLY public.bahrain_consultation_methods
SET
  name_ar = 'مكالمة صوتية',
  name_en = 'Voice Call',
  price = 15.000,
  updated_at = now()
WHERE country_code = 'BH'
  AND code = 'phone';

DO $$
DECLARE
  matching_rows integer;
BEGIN
  SELECT count(*)
    INTO matching_rows
  FROM ONLY public.bahrain_consultation_methods
  WHERE country_code = 'BH'
    AND (
      (code = 'whatsapp' AND name_ar = 'استشارة عبر الواتساب (كتابية)' AND price = 10.000)
      OR (code = 'phone' AND name_ar = 'مكالمة صوتية' AND price = 15.000)
    );

  IF matching_rows <> 2 THEN
    RAISE EXCEPTION 'Expected exactly two updated Bahrain consultation methods, found %', matching_rows;
  END IF;
END $$;
