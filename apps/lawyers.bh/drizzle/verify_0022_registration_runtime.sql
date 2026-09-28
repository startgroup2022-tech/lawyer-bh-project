SELECT
  table_name,
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    SELECT table_prefix || '_lawyers'
    FROM public.countries
    WHERE tables_provisioned = true
  )
  AND column_name = 'working_hours'
ORDER BY table_name;
