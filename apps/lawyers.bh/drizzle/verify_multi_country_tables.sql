-- Read-only verification after running migration 0019.
SELECT
  code,
  table_prefix,
  is_active,
  tables_provisioned,
  provisioned_at
FROM public.countries
ORDER BY code;

SELECT
  c.code,
  c.table_prefix,
  suffix.suffix,
  to_regclass('public.' || c.table_prefix || '_' || suffix.suffix) AS physical_table
FROM public.countries c
CROSS JOIN LATERAL (
  VALUES
    ('consent_log'),
    ('lawyers'),
    ('advocate_shifts'),
    ('lawyer_push_subscriptions'),
    ('emergency_requests'),
    ('lawyer_agreements'),
    ('legal_case_categories'),
    ('legal_cases'),
    ('lawyer_legal_cases'),
    ('booking_requests'),
    ('booking_reviews')
) AS suffix(suffix)
WHERE c.is_active
ORDER BY c.code, suffix.suffix;

-- This query must return zero rows for active countries.
SELECT
  c.code,
  c.table_prefix,
  suffix.suffix AS missing_suffix
FROM public.countries c
CROSS JOIN LATERAL (
  VALUES
    ('consent_log'),
    ('lawyers'),
    ('advocate_shifts'),
    ('lawyer_push_subscriptions'),
    ('emergency_requests'),
    ('lawyer_agreements'),
    ('legal_case_categories'),
    ('legal_cases'),
    ('lawyer_legal_cases'),
    ('booking_requests'),
    ('booking_reviews')
) AS suffix(suffix)
WHERE c.is_active
  AND to_regclass('public.' || c.table_prefix || '_' || suffix.suffix) IS NULL
ORDER BY c.code, suffix.suffix;
