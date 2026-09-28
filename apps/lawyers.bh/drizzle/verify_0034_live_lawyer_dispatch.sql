DO $$
DECLARE
  missing_columns integer;
  invalid_exclusions integer;
  mismatched_assignment integer;
BEGIN
  SELECT count(*)
  INTO missing_columns
  FROM (
    VALUES
      ('bahrain_lawyers', 'live_location'),
      ('bahrain_lawyers', 'live_location_updated_at'),
      ('bahrain_lawyers', 'location_sharing_enabled'),
      ('bahrain_emergency_requests', 'candidate_lawyer_id'),
      ('bahrain_emergency_requests', 'candidate_offered_at'),
      ('bahrain_emergency_requests', 'lawyer_response_deadline'),
      ('bahrain_emergency_requests', 'customer_approved_at'),
      ('bahrain_emergency_requests', 'excluded_lawyer_ids')
  ) AS required(table_name, column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns columns
    WHERE columns.table_schema = 'public'
      AND columns.table_name = required.table_name
      AND columns.column_name = required.column_name
  );

  IF missing_columns <> 0 THEN
    RAISE EXCEPTION 'live lawyer dispatch columns are missing';
  END IF;

  SELECT count(*)
  INTO invalid_exclusions
  FROM public.bahrain_emergency_requests
  WHERE excluded_lawyer_ids IS NULL
     OR jsonb_typeof(excluded_lawyer_ids) <> 'array';

  IF invalid_exclusions <> 0 THEN
    RAISE EXCEPTION 'excluded_lawyer_ids must always be a JSON array';
  END IF;

  SELECT count(*)
  INTO mismatched_assignment
  FROM public.bahrain_emergency_requests
  WHERE assigned_lawyer_id IS NOT NULL
    AND candidate_lawyer_id IS NOT NULL
    AND assigned_lawyer_id <> candidate_lawyer_id;

  IF mismatched_assignment <> 0 THEN
    RAISE EXCEPTION 'assigned lawyer does not match the dispatch candidate';
  END IF;
END;
$$;
