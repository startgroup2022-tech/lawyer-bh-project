-- App-managed appearance: the mobile background image plus the two knobs the
-- admin panel needs to keep it legible (image opacity and a light overlay).
-- The image itself lives in blob storage; only its URL is stored here, next to
-- the existing per-country background_url.
ALTER TABLE public.country_channel_settings
  ADD COLUMN background_opacity integer NOT NULL DEFAULT 100;
--> statement-breakpoint
ALTER TABLE public.country_channel_settings
  ADD COLUMN background_overlay_opacity integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE public.country_channel_settings
  ADD COLUMN background_color text;
--> statement-breakpoint
ALTER TABLE public.country_channel_settings
  ADD CONSTRAINT country_channel_background_opacity_range
  CHECK (background_opacity BETWEEN 0 AND 100);
--> statement-breakpoint
ALTER TABLE public.country_channel_settings
  ADD CONSTRAINT country_channel_background_overlay_range
  CHECK (background_overlay_opacity BETWEEN 0 AND 100);
--> statement-breakpoint
ALTER TABLE public.country_channel_settings
  ADD CONSTRAINT country_channel_background_color_format
  CHECK (background_color IS NULL OR background_color ~ '^#[0-9A-Fa-f]{6}$');
