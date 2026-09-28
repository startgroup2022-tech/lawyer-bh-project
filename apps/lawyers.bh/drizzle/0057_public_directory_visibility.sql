ALTER TABLE public.bahrain_lawyers
  ADD COLUMN IF NOT EXISTS is_public_directory_visible boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS bahrain_lawyers_public_directory_visible_idx
  ON public.bahrain_lawyers (is_public_directory_visible)
  WHERE is_public_directory_visible = false;

UPDATE public.bahrain_lawyers
SET is_review_account = false,
    is_public_directory_visible = false,
    updated_at = NOW()
WHERE id = '3ee97030-bc1a-47c1-b06c-bd2b1acee637'::uuid;
