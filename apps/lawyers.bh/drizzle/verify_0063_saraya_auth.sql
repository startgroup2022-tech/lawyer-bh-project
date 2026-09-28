DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(name, ', ') INTO missing FROM (VALUES ('saraya_invitations'), ('saraya_refresh_sessions'), ('saraya_auth_challenges'), ('saraya_auth_rate_limits'), ('saraya_auth_delivery_attempts')) expected(name)
  WHERE to_regclass('public.' || name) IS NULL;
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'Missing Saraya auth tables: %', missing; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='saraya_invitations_token_hash_uidx') THEN RAISE EXCEPTION 'Missing invitation token unique index'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='saraya_refresh_sessions_token_hash_uidx') THEN RAISE EXCEPTION 'Missing refresh token unique index'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='saraya_refresh_sessions_previous_hash_uidx') THEN RAISE EXCEPTION 'Missing previous refresh token unique index'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saraya_refresh_sessions' AND column_name='family_id') THEN RAISE EXCEPTION 'Missing refresh family'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='saraya_auth_delivery_pending_idx') THEN RAISE EXCEPTION 'Missing auth delivery retry index'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='saraya_auth_rate_limits_updated_idx') THEN RAISE EXCEPTION 'Missing auth rate-limit cleanup index'; END IF;
END $$;
