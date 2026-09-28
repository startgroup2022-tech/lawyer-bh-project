ALTER TABLE bahrain_emergency_requests ADD COLUMN client_access_revoked_at timestamptz;
--> statement-breakpoint
UPDATE bahrain_emergency_requests r SET client_access_revoked_at=l.requested_at,mobile_request_access_digest=NULL
FROM legalsos_account_lifecycle l
WHERE l.subject_role='client' AND l.subject_id=r.client_account_id;
--> statement-breakpoint
CREATE FUNCTION legalsos_preserve_request_revocation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.client_access_revoked_at IS NOT NULL AND NEW.client_access_revoked_at IS DISTINCT FROM OLD.client_access_revoked_at THEN
    RAISE EXCEPTION 'immutable_request_revocation';
  END IF;
  IF NEW.client_access_revoked_at IS NULL AND NEW.client_account_id IS NOT NULL THEN
    SELECT requested_at INTO NEW.client_access_revoked_at FROM legalsos_account_lifecycle
      WHERE subject_role='client' AND subject_id=NEW.client_account_id;
  END IF;
  IF NEW.client_access_revoked_at IS NOT NULL THEN
    NEW.mobile_request_access_digest := NULL;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER legalsos_preserve_request_revocation BEFORE INSERT OR UPDATE ON bahrain_emergency_requests
FOR EACH ROW EXECUTE FUNCTION legalsos_preserve_request_revocation();
