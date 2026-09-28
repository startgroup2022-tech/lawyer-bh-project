UPDATE public.countries
SET is_active = true,
    updated_at = now()
WHERE code = 'SA';
--> statement-breakpoint
INSERT INTO public.country_channel_settings (
  code,
  app_enabled,
  website_enabled,
  updated_at
)
VALUES ('SA', true, false, now())
ON CONFLICT (code) DO UPDATE SET
  app_enabled = EXCLUDED.app_enabled,
  website_enabled = EXCLUDED.website_enabled,
  updated_at = now();
