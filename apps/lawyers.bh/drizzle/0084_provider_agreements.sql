CREATE TABLE IF NOT EXISTS provider_agreement_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number integer GENERATED ALWAYS AS IDENTITY UNIQUE,
 revision integer NOT NULL DEFAULT 1, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 template jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 created_by uuid NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS provider_agreement_one_published ON provider_agreement_versions((status)) WHERE status='published';
CREATE TABLE IF NOT EXISTS provider_agreement_snapshots (
 provider_id uuid PRIMARY KEY, version_id uuid REFERENCES provider_agreement_versions(id), template jsonb,
 data jsonb NOT NULL, legacy boolean NOT NULL, captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION provider_agreement_payload(j jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('fullNameAr',coalesce(j->>'full_name_ar',''),'fullNameEn',coalesce(j->>'full_name_en',''),
 'email',coalesce(j->>'email',''),'phone',coalesce(j->>'phone',''),
 'registrationNo',CASE WHEN j->>'registration_no' LIKE 'INV-%' THEN '' ELSE coalesce(j->>'registration_no','') END,
 'reference','PROVIDER-'||coalesce(nullif(CASE WHEN j->>'registration_no' LIKE 'INV-%' THEN '' ELSE j->>'registration_no' END,''),j->>'id'),
 'signedAt',coalesce(j->>'completed_profile_at',j->>'created_at'),'signatureDataUrl',j->>'signature_data_url');
$$;
CREATE OR REPLACE FUNCTION capture_provider_agreement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE published_template jsonb;
BEGIN
 IF coalesce(NEW.signature_data_url,'')='' OR NOT coalesce(NEW.agreement_accepted,false) THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM provider_agreement_snapshots WHERE provider_id=NEW.id) THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(840084);
 IF NEW.provider_agreement_disclosed AND NEW.provider_agreement_version_id IS NULL AND EXISTS(SELECT 1 FROM provider_agreement_versions WHERE status='published') THEN RAISE EXCEPTION 'agreement_version_stale'; END IF;
 IF NEW.provider_agreement_version_id IS NOT NULL THEN
   SELECT template INTO published_template FROM provider_agreement_versions WHERE id=NEW.provider_agreement_version_id AND status='published';
   IF published_template IS NULL THEN RAISE EXCEPTION 'agreement_version_stale'; END IF;
 END IF;
 INSERT INTO provider_agreement_snapshots(provider_id,version_id,template,data,legacy)
 VALUES(NEW.id,NEW.provider_agreement_version_id,published_template,provider_agreement_payload(to_jsonb(NEW)),NEW.provider_agreement_version_id IS NULL);
 RETURN NEW;
END; $$;
DO $$ BEGIN
 IF to_regclass('public.bahrain_lawyers') IS NOT NULL THEN
   ALTER TABLE bahrain_lawyers ADD COLUMN IF NOT EXISTS provider_agreement_version_id uuid REFERENCES provider_agreement_versions(id);
   ALTER TABLE bahrain_lawyers ADD COLUMN IF NOT EXISTS provider_agreement_disclosed boolean NOT NULL DEFAULT false;
   INSERT INTO provider_agreement_snapshots(provider_id,data,legacy)
   SELECT id,provider_agreement_payload(to_jsonb(l)),true FROM bahrain_lawyers l
   WHERE coalesce(signature_data_url,'')<>'' AND coalesce(agreement_accepted,false) ON CONFLICT(provider_id) DO NOTHING;
   DROP TRIGGER IF EXISTS capture_provider_agreement ON bahrain_lawyers;
   CREATE TRIGGER capture_provider_agreement AFTER INSERT OR UPDATE ON bahrain_lawyers FOR EACH ROW EXECUTE FUNCTION capture_provider_agreement();
 END IF;
END $$;
CREATE OR REPLACE FUNCTION protect_provider_agreement_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable_agreement'; END; $$;
DROP TRIGGER IF EXISTS protect_provider_agreement_snapshot ON provider_agreement_snapshots;
CREATE TRIGGER protect_provider_agreement_snapshot BEFORE UPDATE OR DELETE ON provider_agreement_snapshots FOR EACH ROW EXECUTE FUNCTION protect_provider_agreement_snapshot();
