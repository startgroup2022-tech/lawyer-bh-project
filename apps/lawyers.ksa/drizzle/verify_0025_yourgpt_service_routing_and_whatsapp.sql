DO $$
DECLARE
  whatsapp_count integer;
BEGIN
  SELECT COUNT(*)
  INTO whatsapp_count
  FROM ONLY public.bahrain_consultation_methods
  WHERE country_code = 'BH'
    AND code = 'whatsapp'
    AND price = 10.000
    AND duration_minutes = 15
    AND is_active = true;

  IF whatsapp_count <> 1 THEN
    RAISE EXCEPTION
      'WhatsApp consultation method was not provisioned correctly';
  END IF;
END $$;

SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'yourgpt_payment_sessions'
  AND column_name IN (
    'customer_email',
    'service_key',
    'consultation_method'
  )
ORDER BY column_name;

