DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bahrain_lawyers'
      AND column_name = 'is_public_directory_visible'
      AND is_nullable = 'NO'
      AND column_default = 'true'
  ) THEN
    RAISE EXCEPTION 'bahrain_lawyers.is_public_directory_visible is missing, nullable, or lacks default true';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bahrain_lawyers
    WHERE id = '3ee97030-bc1a-47c1-b06c-bd2b1acee637'::uuid
      AND is_review_account = false
      AND is_public_directory_visible = false
  ) THEN
    RAISE EXCEPTION 'Habib lawyer is not normal-mobile and hidden-web';
  END IF;
END $$;
