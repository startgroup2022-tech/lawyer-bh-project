CREATE TABLE IF NOT EXISTS provider_agreement_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (length(description)<=600),
  archived boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO provider_agreement_library(id,name,description)
VALUES ('84008400-0000-4000-8000-000000000001','الاتفاقية الحالية','الإصدارات السابقة محفوظة دون تعديل')
ON CONFLICT(id) DO NOTHING;
ALTER TABLE provider_agreement_versions ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES provider_agreement_library(id);
UPDATE provider_agreement_versions SET template_id='84008400-0000-4000-8000-000000000001' WHERE template_id IS NULL;
ALTER TABLE provider_agreement_versions ALTER COLUMN template_id SET DEFAULT '84008400-0000-4000-8000-000000000001';
ALTER TABLE provider_agreement_versions ALTER COLUMN template_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS provider_agreement_versions_library ON provider_agreement_versions(template_id,number DESC);
CREATE TABLE IF NOT EXISTS provider_agreement_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES provider_agreement_library(id),
  version_id uuid REFERENCES provider_agreement_versions(id),
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK(action IN ('create','copy','update','archive','restore','save','publish')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION protect_provider_agreement_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable_audit'; END; $$;
DROP TRIGGER IF EXISTS protect_provider_agreement_audit ON provider_agreement_audit;
CREATE TRIGGER protect_provider_agreement_audit BEFORE UPDATE OR DELETE ON provider_agreement_audit
FOR EACH ROW EXECUTE FUNCTION protect_provider_agreement_audit();
