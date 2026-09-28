CREATE TABLE public.country_channel_settings (
  code varchar(2) PRIMARY KEY,
  app_enabled boolean NOT NULL DEFAULT false,
  website_enabled boolean NOT NULL DEFAULT false,
  background_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT country_channel_code CHECK (code ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
-- Preserve existing availability, without updating countries or firing its provisioning trigger.
INSERT INTO public.country_channel_settings (code, app_enabled, website_enabled)
SELECT code, is_active AND tables_provisioned, is_active AND tables_provisioned
FROM public.countries;
