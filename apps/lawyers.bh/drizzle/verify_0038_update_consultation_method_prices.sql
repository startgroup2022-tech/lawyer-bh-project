DO $$
DECLARE
  whatsapp_count integer;
  phone_count integer;
BEGIN
  SELECT count(*)
    INTO whatsapp_count
  FROM ONLY public.bahrain_consultation_methods
  WHERE country_code = 'BH'
    AND code = 'whatsapp'
    AND name_ar = 'استشارة عبر الواتساب (كتابية)'
    AND price = 10.000;

  SELECT count(*)
    INTO phone_count
  FROM ONLY public.bahrain_consultation_methods
  WHERE country_code = 'BH'
    AND code = 'phone'
    AND name_ar = 'مكالمة صوتية'
    AND price = 15.000;

  IF whatsapp_count <> 1 OR phone_count <> 1 THEN
    RAISE EXCEPTION 'Consultation method pricing verification failed: whatsapp=%, phone=%',
      whatsapp_count,
      phone_count;
  END IF;
END $$;
