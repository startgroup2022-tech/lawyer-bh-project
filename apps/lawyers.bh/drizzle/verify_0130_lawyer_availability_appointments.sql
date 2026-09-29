DO $$
BEGIN
  IF to_regclass('public.bahrain_lawyer_availability') IS NULL THEN
    RAISE EXCEPTION 'Lawyer availability table is missing';
  END IF;

  IF to_regclass('public.bahrain_lawyer_blocked_dates') IS NULL THEN
    RAISE EXCEPTION 'Lawyer blocked dates table is missing';
  END IF;

  IF to_regclass('public.bahrain_appointment_slots') IS NULL THEN
    RAISE EXCEPTION 'Appointment slots table is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lawyer_availability_weekday_check'
  ) THEN
    RAISE EXCEPTION 'Lawyer availability weekday constraint is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lawyer_availability_time_check'
  ) THEN
    RAISE EXCEPTION 'Lawyer availability time constraint is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lawyer_blocked_dates_range_check'
  ) THEN
    RAISE EXCEPTION 'Lawyer blocked dates range constraint is missing';
  END IF;

  IF to_regclass('public.appointment_slots_lawyer_date_start_active_uidx') IS NULL THEN
    RAISE EXCEPTION 'Appointment slot double-booking guard index is missing';
  END IF;

  IF to_regclass('public.appointment_slots_booking_unique_idx') IS NULL THEN
    RAISE EXCEPTION 'Appointment slot booking uniqueness index is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bahrain_lawyers' AND column_name = 'profile_status'
  ) THEN
    RAISE EXCEPTION 'Lawyer profile_status column is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bahrain_lawyers' AND column_name = 'consultation_fee'
  ) THEN
    RAISE EXCEPTION 'Lawyer consultation_fee column is missing';
  END IF;
END $$;
