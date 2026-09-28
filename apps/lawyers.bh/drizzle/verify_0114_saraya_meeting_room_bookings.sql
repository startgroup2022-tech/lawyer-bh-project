DO $$
DECLARE
  required_name text;
BEGIN
  IF to_regclass('public.saraya_meeting_rooms') IS NULL THEN
    RAISE EXCEPTION 'missing saraya_meeting_rooms';
  END IF;
  IF to_regclass('public.saraya_meeting_room_bookings') IS NULL THEN
    RAISE EXCEPTION 'missing saraya_meeting_room_bookings';
  END IF;

  FOREACH required_name IN ARRAY ARRAY[
    'saraya_meeting_rooms_property_id_key',
    'saraya_meeting_room_bookings_property_room_fk',
    'saraya_meeting_room_bookings_property_tenant_fk',
    'saraya_meeting_room_bookings_booked_by_fk'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = required_name) THEN
      RAISE EXCEPTION 'missing constraint %', required_name;
    END IF;
  END LOOP;

  FOREACH required_name IN ARRAY ARRAY[
    'saraya_meeting_rooms_property_status_idx',
    'saraya_meeting_room_bookings_room_time_idx',
    'saraya_meeting_room_bookings_property_start_idx',
    'saraya_meeting_room_bookings_user_start_idx'
  ] LOOP
    IF to_regclass('public.' || required_name) IS NULL THEN
      RAISE EXCEPTION 'missing index %', required_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'saraya_meeting_room_bookings_no_overlap'
      AND tgrelid = 'public.saraya_meeting_room_bookings'::regclass
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'missing saraya_meeting_room_bookings_no_overlap';
  END IF;
END;
$$;
