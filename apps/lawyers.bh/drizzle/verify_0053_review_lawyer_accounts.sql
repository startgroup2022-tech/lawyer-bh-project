DO $$
DECLARE
  marked_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bahrain_lawyers'
      AND column_name = 'is_review_account'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'bahrain_lawyers.is_review_account is missing or nullable';
  END IF;

  SELECT count(*) INTO marked_count
  FROM public.bahrain_lawyers
  WHERE is_review_account = true
    AND lower(trim(email)) <> 'habib20298@gmail.com';

  IF marked_count <> 0 THEN
    RAISE EXCEPTION 'unexpected lawyer accounts are marked for review';
  END IF;
END $$;
