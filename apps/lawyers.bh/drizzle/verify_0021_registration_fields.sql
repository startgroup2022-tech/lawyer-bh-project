SELECT
  table_name,
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE '%\_lawyers' ESCAPE '\\'
  AND column_name IN (
    'registration_level',
    'working_hours',
    'specialty_main',
    'specialty_subs',
    'specialties'
  )
ORDER BY table_name, column_name;

SELECT
  code,
  table_prefix,
  is_active,
  tables_provisioned
FROM public.countries
ORDER BY code;
