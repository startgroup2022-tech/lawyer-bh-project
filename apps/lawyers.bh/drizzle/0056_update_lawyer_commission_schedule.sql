-- Keep lawyer commission schedules anchored to the durable approval timestamp.
-- Historical payment allocation snapshots are intentionally not modified.

INSERT INTO public.bahrain_provider_commission_rates (
  country_code,
  provider_id,
  platform_percentage,
  provider_percentage,
  effective_from,
  effective_to,
  is_active,
  notes,
  created_at,
  updated_at
)
SELECT
  COALESCE(NULLIF(UPPER(BTRIM(l.country_code)), ''), 'BH'),
  l.id,
  20.00,
  80.00,
  l.reviewed_at,
  l.reviewed_at + INTERVAL '1 year',
  true,
  'First-year commission rate',
  NOW(),
  NOW()
FROM public.bahrain_lawyers AS l
WHERE l.status = 'approved'
  AND l.reviewed_at IS NOT NULL
ON CONFLICT (provider_id, effective_from)
DO NOTHING;

INSERT INTO public.bahrain_provider_commission_rates (
  country_code,
  provider_id,
  platform_percentage,
  provider_percentage,
  effective_from,
  effective_to,
  is_active,
  notes,
  created_at,
  updated_at
)
SELECT
  COALESCE(NULLIF(UPPER(BTRIM(l.country_code)), ''), 'BH'),
  l.id,
  45.00,
  55.00,
  l.reviewed_at + INTERVAL '1 year',
  NULL,
  true,
  'Commission rate after the first year',
  NOW(),
  NOW()
FROM public.bahrain_lawyers AS l
WHERE l.status = 'approved'
  AND l.reviewed_at IS NOT NULL
ON CONFLICT (provider_id, effective_from)
DO NOTHING;
