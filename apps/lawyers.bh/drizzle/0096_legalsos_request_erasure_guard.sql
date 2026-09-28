ALTER TABLE bahrain_emergency_requests ADD COLUMN client_data_purged_at timestamptz;
--> statement-breakpoint
CREATE FUNCTION legalsos_preserve_request_erasure() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.client_data_purged_at IS NOT NULL THEN
    NEW.client_data_purged_at := OLD.client_data_purged_at;
  END IF;
  IF NEW.client_data_purged_at IS NOT NULL THEN
    NEW.contact_name := '';
    NEW.contact_phone := '';
    NEW.contact_id_number := NULL;
    NEW.description := NULL;
    NEW.location := NULL;
    NEW.rating_comment := NULL;
    NEW.internal_notes := '[]'::json;
    NEW.dispatch_actor_log := '[]'::json;
    NEW.cancellation_reason := NULL;
    NEW.tap_payload := NULL;
    NEW.consent_id := NULL;
    NEW.mobile_request_access_digest := NULL;
    NEW.client_access_revoked_at := COALESCE(NEW.client_access_revoked_at,NEW.client_data_purged_at);
  END IF;
  IF EXISTS(SELECT 1 FROM legalsos_account_lifecycle WHERE subject_role='lawyer'
    AND subject_id=NEW.assigned_lawyer_id AND state IN ('purging','purged') AND purge_after<=now()) THEN
    NEW.last_advocate_location := NULL;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER legalsos_preserve_request_erasure BEFORE INSERT OR UPDATE ON bahrain_emergency_requests
FOR EACH ROW EXECUTE FUNCTION legalsos_preserve_request_erasure();
--> statement-breakpoint
ALTER TABLE bahrain_payment_allocations ADD COLUMN customer_data_purged_at timestamptz;
--> statement-breakpoint
CREATE FUNCTION legalsos_preserve_payment_customer_erasure() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE erased_at timestamptz;
BEGIN
  IF TG_OP='UPDATE' AND OLD.customer_data_purged_at IS NOT NULL THEN
    NEW.customer_data_purged_at := OLD.customer_data_purged_at;
  END IF;
  -- Serialize against the request purge so a delayed callback cannot win the race.
  SELECT client_data_purged_at INTO erased_at FROM bahrain_emergency_requests
    WHERE id=NEW.emergency_request_id FOR SHARE;
  IF erased_at IS NULL AND TG_OP='UPDATE' THEN
    SELECT client_data_purged_at INTO erased_at FROM bahrain_emergency_requests
      WHERE id=OLD.emergency_request_id FOR SHARE;
  END IF;
  NEW.customer_data_purged_at := COALESCE(NEW.customer_data_purged_at,erased_at);
  IF NEW.customer_data_purged_at IS NOT NULL THEN
    NEW.customer_name_snapshot := NULL;
    NEW.split_error := NULL;
    NEW.reconciliation_error := NULL;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER legalsos_preserve_payment_customer_erasure BEFORE INSERT OR UPDATE ON bahrain_payment_allocations
FOR EACH ROW EXECUTE FUNCTION legalsos_preserve_payment_customer_erasure();
