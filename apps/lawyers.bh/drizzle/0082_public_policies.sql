-- Schema only: preserve every publication, acceptance and commission record.
ALTER TABLE terms_versions DROP CONSTRAINT IF EXISTS terms_versions_document_type_check;
ALTER TABLE terms_versions ADD CONSTRAINT terms_versions_document_type_check
  CHECK (document_type IN ('general', 'privacy', 'refund', 'legalsos_terms', 'legalsos_privacy', 'legalsos_lawyer_agreement', 'lawyer_registration'));
ALTER TABLE terms_versions DROP CONSTRAINT IF EXISTS terms_versions_commission_scope_check;
ALTER TABLE terms_versions ADD CONSTRAINT terms_versions_commission_scope_check CHECK (
  (document_type IN ('general', 'privacy', 'refund', 'legalsos_terms', 'legalsos_privacy', 'legalsos_lawyer_agreement') AND platform_percentage_year_one IS NULL AND platform_percentage_year_two IS NULL)
  OR (document_type = 'lawyer_registration' AND platform_percentage_year_one IS NOT NULL AND platform_percentage_year_two IS NOT NULL)
);
