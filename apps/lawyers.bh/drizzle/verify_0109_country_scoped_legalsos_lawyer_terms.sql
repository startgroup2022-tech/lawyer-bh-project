DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM terms_versions
    WHERE document_type = 'legalsos_lawyer_agreement'
      AND country_code IS NULL
  ) THEN
    RAISE EXCEPTION 'LegalSOS lawyer agreement is missing country_code';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM terms_versions
    WHERE document_type = 'legalsos_lawyer_agreement'
      AND country_code = 'BH' AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'Published Bahrain lawyer agreement is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM terms_versions
    WHERE document_type = 'legalsos_lawyer_agreement'
      AND country_code = 'SA' AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'Published Saudi lawyer agreement is missing';
  END IF;
END $$;
