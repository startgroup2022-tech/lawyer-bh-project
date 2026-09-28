CREATE TABLE IF NOT EXISTS provider_agreement_upload_limits (
 key text PRIMARY KEY, attempts integer NOT NULL DEFAULT 1, window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS provider_agreement_uploads (
 token_hash text PRIMARY KEY, version_id uuid NOT NULL REFERENCES provider_agreement_versions(id),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '1 hour', provider_id uuid
);
CREATE TABLE IF NOT EXISTS provider_agreement_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text NOT NULL REFERENCES provider_agreement_uploads(token_hash),
 field_id text NOT NULL, name text NOT NULL, mime text NOT NULL CHECK(mime IN ('application/pdf','image/png','image/jpeg')),
 size integer NOT NULL CHECK(size BETWEEN 1 AND 5242880), bytes bytea NOT NULL DEFAULT '\x',
 verified boolean NOT NULL DEFAULT false, sha256 text, provider_id uuid,
 UNIQUE(token_hash,field_id), CHECK(octet_length(bytes)<=size)
);
CREATE OR REPLACE FUNCTION protect_provider_agreement_file() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF OLD.provider_id IS NOT NULL THEN RAISE EXCEPTION 'immutable_agreement_file'; END IF; IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS protect_provider_agreement_file ON provider_agreement_files;
CREATE TRIGGER protect_provider_agreement_file BEFORE UPDATE OR DELETE ON provider_agreement_files FOR EACH ROW EXECUTE FUNCTION protect_provider_agreement_file();
DO $$ BEGIN
 IF to_regclass('public.bahrain_lawyers') IS NOT NULL THEN
  ALTER TABLE bahrain_lawyers ADD COLUMN IF NOT EXISTS provider_agreement_extras jsonb NOT NULL DEFAULT '{}';
  ALTER TABLE bahrain_lawyers ADD COLUMN IF NOT EXISTS provider_agreement_upload_hash text;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION capture_provider_agreement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE published_template jsonb; payload jsonb; field jsonb; value text; attachment provider_agreement_files%ROWTYPE; upload provider_agreement_uploads%ROWTYPE; names jsonb:='{}'; files jsonb:='[]';
BEGIN
 IF coalesce(NEW.signature_data_url,'')='' OR NOT coalesce(NEW.agreement_accepted,false) THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM provider_agreement_snapshots WHERE provider_id=NEW.id) THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(840084);
 IF NEW.provider_agreement_disclosed AND NEW.provider_agreement_version_id IS NULL AND EXISTS(SELECT 1 FROM provider_agreement_versions WHERE status='published') THEN RAISE EXCEPTION 'agreement_version_stale'; END IF;
 IF NEW.provider_agreement_version_id IS NOT NULL THEN
  SELECT template INTO published_template FROM provider_agreement_versions WHERE id=NEW.provider_agreement_version_id AND status='published';
  IF published_template IS NULL THEN RAISE EXCEPTION 'agreement_version_stale'; END IF;
 END IF;
 payload:=provider_agreement_payload(to_jsonb(NEW));
 IF published_template ? 'builder' THEN
  IF jsonb_typeof(NEW.provider_agreement_extras)<>'object' THEN RAISE EXCEPTION 'invalid_agreement_values'; END IF;
  FOR field IN SELECT * FROM jsonb_array_elements(published_template->'builder'->'fields') LOOP
   value:=NEW.provider_agreement_extras->>(field->>'id');
   IF coalesce((field->>'required')::boolean,false) AND coalesce(btrim(value),'')='' THEN RAISE EXCEPTION 'invalid_agreement_values'; END IF;
   IF field->>'kind'='file' AND coalesce(value,'')<>'' THEN
    SELECT * INTO upload FROM provider_agreement_uploads WHERE token_hash=NEW.provider_agreement_upload_hash AND version_id=NEW.provider_agreement_version_id AND expires_at>now() AND provider_id IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_agreement_files'; END IF;
    SELECT * INTO attachment FROM provider_agreement_files WHERE id::text=value AND token_hash=upload.token_hash AND field_id=field->>'id' AND verified AND sha256 IS NOT NULL AND octet_length(bytes)=size AND provider_id IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_agreement_files'; END IF;
    names:=names||jsonb_build_object(value,attachment.name);
    files:=files||jsonb_build_array(jsonb_build_object('id',attachment.id,'fieldId',attachment.field_id,'name',attachment.name,'mime',attachment.mime,'size',attachment.size,'sha256',attachment.sha256));
    UPDATE provider_agreement_files SET provider_id=NEW.id WHERE id=attachment.id;
   END IF;
  END LOOP;
  IF jsonb_array_length(files)>0 THEN UPDATE provider_agreement_uploads SET provider_id=NEW.id WHERE token_hash=NEW.provider_agreement_upload_hash; END IF;
  payload:=payload||jsonb_build_object('extraValues',NEW.provider_agreement_extras,'fileNames',names,'files',files);
 END IF;
 INSERT INTO provider_agreement_snapshots(provider_id,version_id,template,data,legacy)
 VALUES(NEW.id,NEW.provider_agreement_version_id,published_template,payload,NEW.provider_agreement_version_id IS NULL);
 RETURN NEW;
END; $$;
