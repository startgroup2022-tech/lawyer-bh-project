ALTER TABLE public.bahrain_emergency_requests
  ADD COLUMN IF NOT EXISTS mobile_request_access_digest text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS bahrain_emergency_mobile_request_access_idx
  ON public.bahrain_emergency_requests (mobile_request_access_digest)
  WHERE mobile_request_access_digest IS NOT NULL;
