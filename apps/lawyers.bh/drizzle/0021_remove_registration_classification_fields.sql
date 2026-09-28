BEGIN;

-- The registration form no longer collects registration level, working hours,
-- or specialties. Keep the columns for backward compatibility, but make them
-- empty for new and existing accounts in every country table.
ALTER TABLE public.bahrain_lawyers
  ALTER COLUMN working_hours DROP NOT NULL,
  ALTER COLUMN working_hours DROP DEFAULT;

UPDATE public.bahrain_lawyers
SET
  registration_level = NULL,
  working_hours = NULL,
  specialty_main = NULL,
  specialty_subs = '[]'::json,
  specialties = '{"main":"","subs":[]}'::json;

COMMIT;
