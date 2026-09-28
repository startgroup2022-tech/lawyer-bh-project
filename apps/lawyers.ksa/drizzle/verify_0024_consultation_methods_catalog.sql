SELECT
  code,
  name_ar,
  name_en,
  price,
  currency_code,
  duration_minutes,
  is_active,
  sort_order
FROM ONLY public.bahrain_consultation_methods
ORDER BY sort_order;
