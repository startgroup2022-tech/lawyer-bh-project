ALTER TABLE public.bahrain_lawyers
  ADD COLUMN IF NOT EXISTS is_review_account boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS bahrain_lawyers_review_account_idx
  ON public.bahrain_lawyers (is_review_account)
  WHERE is_review_account = true;
--> statement-breakpoint
UPDATE public.bahrain_lawyers
SET is_review_account = true,
    updated_at = NOW()
WHERE lower(trim(email)) = 'habib20298@gmail.com';
