-- Lawyer availability + appointment booking.
--
-- Three global tables, keyed by country_code. `lawyer_id` and
-- `booking_request_id` reference the inheritance parents (bahrain_lawyers,
-- bahrain_booking_requests), so rows for every provisioned country are covered
-- by the same foreign keys.

CREATE TABLE IF NOT EXISTS public.bahrain_lawyer_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  lawyer_id uuid NOT NULL REFERENCES public.bahrain_lawyers (id) ON DELETE CASCADE,
  weekday smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer NOT NULL DEFAULT 30,
  consultation_type text NOT NULL DEFAULT 'any',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lawyer_availability_weekday_check CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT lawyer_availability_time_check CHECK (start_time < end_time),
  CONSTRAINT lawyer_availability_duration_check CHECK (slot_duration_minutes BETWEEN 5 AND 480)
);

CREATE INDEX IF NOT EXISTS lawyer_availability_lawyer_idx
  ON public.bahrain_lawyer_availability (lawyer_id, weekday);

CREATE INDEX IF NOT EXISTS bahrain_lawyer_availability_country_code_idx
  ON public.bahrain_lawyer_availability (country_code);

CREATE TABLE IF NOT EXISTS public.bahrain_lawyer_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  lawyer_id uuid NOT NULL REFERENCES public.bahrain_lawyers (id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  all_day boolean NOT NULL DEFAULT true,
  start_time time,
  end_time time,
  reason_type text NOT NULL DEFAULT 'other',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lawyer_blocked_dates_range_check CHECK (
    all_day OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

CREATE INDEX IF NOT EXISTS lawyer_blocked_dates_lawyer_idx
  ON public.bahrain_lawyer_blocked_dates (lawyer_id, blocked_date);

CREATE INDEX IF NOT EXISTS bahrain_lawyer_blocked_dates_country_code_idx
  ON public.bahrain_lawyer_blocked_dates (country_code);

CREATE TABLE IF NOT EXISTS public.bahrain_appointment_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2) NOT NULL DEFAULT 'BH',
  lawyer_id uuid NOT NULL REFERENCES public.bahrain_lawyers (id) ON DELETE CASCADE,
  booking_request_id uuid NOT NULL REFERENCES public.bahrain_booking_requests (id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'booked',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_slots_time_check CHECK (start_time < end_time)
);

CREATE UNIQUE INDEX IF NOT EXISTS appointment_slots_booking_unique_idx
  ON public.bahrain_appointment_slots (booking_request_id);

-- The database-level double-booking guard: at most one active slot per lawyer
-- per date + start time. Cancelled/rejected slots drop out of the index.
CREATE UNIQUE INDEX IF NOT EXISTS appointment_slots_lawyer_date_start_active_uidx
  ON public.bahrain_appointment_slots (lawyer_id, appointment_date, start_time)
  WHERE status IN ('booked', 'confirmed');

CREATE INDEX IF NOT EXISTS appointment_slots_lawyer_date_idx
  ON public.bahrain_appointment_slots (lawyer_id, appointment_date);

CREATE INDEX IF NOT EXISTS bahrain_appointment_slots_country_code_idx
  ON public.bahrain_appointment_slots (country_code);

-- Self-published profile fields the mobile app shows and edits. All additive
-- and nullable (or defaulted), so existing rows are untouched.
ALTER TABLE public.bahrain_lawyers
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS professional_title text,
  ADD COLUMN IF NOT EXISTS professional_title_en text,
  ADD COLUMN IF NOT EXISTS office_location text,
  ADD COLUMN IF NOT EXISTS languages json NOT NULL DEFAULT '[]'::json,
  ADD COLUMN IF NOT EXISTS qualifications json NOT NULL DEFAULT '[]'::json,
  ADD COLUMN IF NOT EXISTS consultation_fee numeric(10, 3),
  ADD COLUMN IF NOT EXISTS accepts_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepts_inperson boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_status text NOT NULL DEFAULT 'draft';

-- Constraints have no IF NOT EXISTS, so guard them for idempotent re-runs.
DO $$
BEGIN
  -- The client offers draft/published/hidden; widen an install that ran the
  -- earlier draft/published-only version of this migration.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bahrain_lawyers_profile_status_check'
      AND pg_get_constraintdef(oid) NOT LIKE '%hidden%'
  ) THEN
    ALTER TABLE public.bahrain_lawyers
      DROP CONSTRAINT bahrain_lawyers_profile_status_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bahrain_lawyers_profile_status_check'
  ) THEN
    ALTER TABLE public.bahrain_lawyers
      ADD CONSTRAINT bahrain_lawyers_profile_status_check
      CHECK (profile_status IN ('draft', 'published', 'hidden'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bahrain_lawyers_consultation_fee_check'
  ) THEN
    ALTER TABLE public.bahrain_lawyers
      ADD CONSTRAINT bahrain_lawyers_consultation_fee_check
      CHECK (consultation_fee IS NULL OR consultation_fee >= 0);
  END IF;
END $$;

