-- Admin-managed Tap payment gateway credentials.
--
-- Single-row table (enforced by the boolean primary key) so an administrator
-- can switch between TEST and LIVE credentials without editing environment
-- variables or redeploying. Secret keys are stored encrypted (AES-256-GCM,
-- key derived from TAP_CONFIG_ENCRYPTION_KEY) and are never returned by the
-- admin API; only a mask and a "configured" flag leave the server.

CREATE TABLE IF NOT EXISTS public.tap_gateway_settings (
  id boolean PRIMARY KEY DEFAULT true,
  active_environment text NOT NULL DEFAULT 'test',
  live_enabled boolean NOT NULL DEFAULT false,

  test_secret_key_encrypted text,
  test_public_key text,
  test_merchant_id text,
  test_marketplace_mid text,

  live_secret_key_encrypted text,
  live_public_key text,
  live_merchant_id text,
  live_marketplace_mid text,

  last_test_status text,
  last_test_at timestamptz,
  last_test_message text,

  updated_by uuid REFERENCES public.admin_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tap_gateway_settings_environment_check
    CHECK (active_environment IN ('test', 'live')),
  CONSTRAINT tap_gateway_settings_test_status_check
    CHECK (last_test_status IS NULL OR last_test_status IN ('connected', 'failed')),
  -- LIVE can only be the active environment once an administrator has
  -- explicitly enabled it, so a partial TEST setup can never silently take
  -- real payments.
  CONSTRAINT tap_gateway_settings_live_requires_enable
    CHECK (active_environment <> 'live' OR live_enabled)
);

INSERT INTO public.tap_gateway_settings (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;
