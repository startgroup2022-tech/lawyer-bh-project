ALTER TABLE terms_versions ADD COLUMN IF NOT EXISTS country_code varchar(2);

UPDATE terms_versions
SET country_code = 'BH'
WHERE document_type = 'legalsos_lawyer_agreement' AND country_code IS NULL;

UPDATE terms_versions
SET country_code = NULL
WHERE document_type <> 'legalsos_lawyer_agreement' AND country_code IS NOT NULL;

DROP INDEX IF EXISTS terms_versions_document_version_unique_idx;
DROP INDEX IF EXISTS terms_versions_one_published_per_document_idx;

CREATE UNIQUE INDEX IF NOT EXISTS terms_versions_document_version_unique_idx
  ON terms_versions(document_type, version)
  WHERE document_type <> 'legalsos_lawyer_agreement';

CREATE UNIQUE INDEX IF NOT EXISTS terms_versions_country_document_version_unique_idx
  ON terms_versions(document_type, country_code, version)
  WHERE document_type = 'legalsos_lawyer_agreement';

CREATE UNIQUE INDEX IF NOT EXISTS terms_versions_one_published_per_document_idx
  ON terms_versions(document_type)
  WHERE status = 'published' AND document_type <> 'legalsos_lawyer_agreement';

CREATE UNIQUE INDEX IF NOT EXISTS terms_versions_one_published_per_country_document_idx
  ON terms_versions(document_type, country_code)
  WHERE status = 'published' AND document_type = 'legalsos_lawyer_agreement';

ALTER TABLE terms_versions DROP CONSTRAINT IF EXISTS terms_versions_country_scope_check;
ALTER TABLE terms_versions ADD CONSTRAINT terms_versions_country_scope_check CHECK (
  (document_type = 'legalsos_lawyer_agreement' AND country_code ~ '^[A-Z]{2}$')
  OR (document_type <> 'legalsos_lawyer_agreement' AND country_code IS NULL)
);

INSERT INTO terms_versions (
  document_type, country_code, version, status, content_ar, content_en, published_at
)
SELECT
  document_type, 'SA', version, status, content_ar, content_en, published_at
FROM terms_versions source
WHERE source.document_type = 'legalsos_lawyer_agreement'
  AND source.country_code = 'BH'
  AND source.status = 'published'
  AND NOT EXISTS (
    SELECT 1 FROM terms_versions target
    WHERE target.document_type = 'legalsos_lawyer_agreement'
      AND target.country_code = 'SA'
      AND target.status = 'published'
  )
ORDER BY source.published_at DESC NULLS LAST
LIMIT 1;
