CREATE TABLE public.saraya_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  property_id uuid NOT NULL REFERENCES public.saraya_properties(id) ON DELETE CASCADE,
  role public.saraya_role NOT NULL,
  normalized_email text,
  normalized_phone varchar(32),
  token_hash text NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  consumed_at timestamptz(3),
  invited_by_user_id uuid REFERENCES public.saraya_users(id) ON DELETE SET NULL,
  created_at timestamptz(3) DEFAULT now() NOT NULL,
  updated_at timestamptz(3) DEFAULT now() NOT NULL,
  CONSTRAINT saraya_invitations_identity_check CHECK (normalized_email IS NOT NULL OR normalized_phone IS NOT NULL),
  CONSTRAINT saraya_invitations_expiry_check CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX saraya_invitations_token_hash_uidx ON public.saraya_invitations(token_hash);
CREATE INDEX saraya_invitations_property_idx ON public.saraya_invitations(property_id);

CREATE TABLE public.saraya_refresh_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  family_id uuid NOT NULL,
  generation integer DEFAULT 0 NOT NULL,
  user_id uuid NOT NULL REFERENCES public.saraya_users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL,
  previous_refresh_token_hash text,
  expires_at timestamptz(3) NOT NULL,
  rotated_at timestamptz(3),
  revoked_at timestamptz(3),
  created_at timestamptz(3) DEFAULT now() NOT NULL,
  CONSTRAINT saraya_refresh_sessions_generation_check CHECK (generation >= 0)
);
CREATE UNIQUE INDEX saraya_refresh_sessions_token_hash_uidx ON public.saraya_refresh_sessions(refresh_token_hash);
CREATE UNIQUE INDEX saraya_refresh_sessions_previous_hash_uidx ON public.saraya_refresh_sessions(previous_refresh_token_hash) WHERE previous_refresh_token_hash IS NOT NULL;
CREATE INDEX saraya_refresh_sessions_user_idx ON public.saraya_refresh_sessions(user_id);
CREATE INDEX saraya_refresh_sessions_family_idx ON public.saraya_refresh_sessions(family_id);

CREATE TABLE public.saraya_auth_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid REFERENCES public.saraya_users(id) ON DELETE CASCADE,
  normalized_email text,
  normalized_phone varchar(32),
  purpose varchar(32) NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  consumed_at timestamptz(3),
  created_at timestamptz(3) DEFAULT now() NOT NULL,
  CONSTRAINT saraya_auth_challenges_purpose_check CHECK (purpose IN ('activate', 'forgot_password', 'phone_otp')),
  CONSTRAINT saraya_auth_challenges_identity_check CHECK (user_id IS NOT NULL OR normalized_email IS NOT NULL OR normalized_phone IS NOT NULL)
);
CREATE UNIQUE INDEX saraya_auth_challenges_token_hash_uidx ON public.saraya_auth_challenges(token_hash);
CREATE INDEX saraya_auth_challenges_user_idx ON public.saraya_auth_challenges(user_id);

CREATE TABLE public.saraya_auth_rate_limits (
  bucket text PRIMARY KEY NOT NULL,
  window_started_at timestamptz(3) NOT NULL,
  count integer DEFAULT 1 NOT NULL,
  updated_at timestamptz(3) DEFAULT now() NOT NULL,
  CONSTRAINT saraya_auth_rate_limits_count_check CHECK (count > 0)
);
CREATE INDEX saraya_auth_rate_limits_updated_idx ON public.saraya_auth_rate_limits(updated_at);

CREATE TABLE public.saraya_auth_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.saraya_auth_challenges(id) ON DELETE CASCADE,
  channel varchar(16) NOT NULL,
  status varchar(16) DEFAULT 'queued' NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  last_error_code text,
  next_attempt_at timestamptz(3),
  created_at timestamptz(3) DEFAULT now() NOT NULL,
  updated_at timestamptz(3) DEFAULT now() NOT NULL,
  CONSTRAINT saraya_auth_delivery_channel_check CHECK (channel IN ('email', 'sms')),
  CONSTRAINT saraya_auth_delivery_status_check CHECK (status IN ('queued', 'sent', 'failed'))
);
CREATE INDEX saraya_auth_delivery_pending_idx ON public.saraya_auth_delivery_attempts(status, next_attempt_at);
