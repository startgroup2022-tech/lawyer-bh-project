DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.bahrain_lawyers AS l
    WHERE l.status = 'approved'
      AND l.reviewed_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.bahrain_provider_commission_rates AS r
        WHERE r.provider_id = l.id
          AND r.effective_from = l.reviewed_at
          AND r.effective_to = l.reviewed_at + INTERVAL '1 year'
          AND r.platform_percentage = 20.00
          AND r.provider_percentage = 80.00
          AND r.is_active = true
      )
  ) THEN
    RAISE EXCEPTION 'Missing or invalid first-year lawyer commission rate';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bahrain_lawyers AS l
    WHERE l.status = 'approved'
      AND l.reviewed_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.bahrain_provider_commission_rates AS r
        WHERE r.provider_id = l.id
          AND r.effective_from = l.reviewed_at + INTERVAL '1 year'
          AND r.effective_to IS NULL
          AND r.platform_percentage = 45.00
          AND r.provider_percentage = 55.00
          AND r.is_active = true
      )
  ) THEN
    RAISE EXCEPTION 'Missing or invalid second-year lawyer commission rate';
  END IF;
END $$;
