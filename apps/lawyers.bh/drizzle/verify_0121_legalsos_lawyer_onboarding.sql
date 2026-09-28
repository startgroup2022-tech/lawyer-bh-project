DO $$
BEGIN
  IF to_regclass('public.legalsos_lawyer_onboarding') IS NULL THEN
    RAISE EXCEPTION 'LegalSOS lawyer onboarding table is missing';
  END IF;

  IF to_regclass('public.legalsos_lawyer_onboarding_rate_limits') IS NULL THEN
    RAISE EXCEPTION 'LegalSOS lawyer onboarding rate-limit table is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'legalsos_lawyer_onboarding_status_check'
  ) THEN
    RAISE EXCEPTION 'LegalSOS lawyer onboarding status constraint is missing';
  END IF;

  IF to_regclass('public.legalsos_lawyer_onboarding_email_active_uidx') IS NULL
     OR to_regclass('public.legalsos_lawyer_onboarding_identifier_active_uidx') IS NULL THEN
    RAISE EXCEPTION 'LegalSOS lawyer onboarding active identity indexes are missing';
  END IF;

  IF to_regclass('public.legalsos_lawyer_onboarding_verification_token_uidx') IS NULL
     OR to_regclass('public.legalsos_lawyer_onboarding_session_token_uidx') IS NULL THEN
    RAISE EXCEPTION 'LegalSOS lawyer onboarding token indexes are missing';
  END IF;
END $$;
