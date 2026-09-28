-- Closing an app account must not let delayed events recreate its inbox.
-- Keep public announcements and the other party's inbox untouched.
CREATE FUNCTION legalsos_guard_closed_notification_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='mobile_lawyer_notifications' THEN
    IF EXISTS (SELECT 1 FROM legalsos_account_lifecycle
      WHERE subject_role='lawyer' AND subject_id=NEW.lawyer_id) THEN
      RETURN NULL;
    END IF;
  ELSIF TG_TABLE_NAME='mobile_client_notifications' THEN
    IF NEW.request_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM bahrain_emergency_requests r
      LEFT JOIN legalsos_account_lifecycle l ON l.subject_role='client' AND l.subject_id=r.client_account_id
      WHERE r.id=NEW.request_id AND (r.client_access_revoked_at IS NOT NULL OR l.id IS NOT NULL)
    ) THEN
      RETURN NULL;
    END IF;
  ELSIF TG_TABLE_NAME='mobile_client_notification_reads' THEN
    IF EXISTS (SELECT 1 FROM legalsos_account_lifecycle
      WHERE subject_role='client' AND 'client:'||subject_id::text=NEW.owner_key)
      OR EXISTS (SELECT 1 FROM bahrain_emergency_requests r
        LEFT JOIN legalsos_account_lifecycle l ON l.subject_role='client' AND l.subject_id=r.client_account_id
        WHERE 'request:'||r.id::text=NEW.owner_key AND (r.client_access_revoked_at IS NOT NULL OR l.id IS NOT NULL)) THEN
      RETURN NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER legalsos_guard_client_notification BEFORE INSERT OR UPDATE ON mobile_client_notifications
FOR EACH ROW EXECUTE FUNCTION legalsos_guard_closed_notification_owner();
--> statement-breakpoint
CREATE TRIGGER legalsos_guard_client_notification_read BEFORE INSERT OR UPDATE ON mobile_client_notification_reads
FOR EACH ROW EXECUTE FUNCTION legalsos_guard_closed_notification_owner();
--> statement-breakpoint
CREATE TRIGGER legalsos_guard_lawyer_notification BEFORE INSERT OR UPDATE ON mobile_lawyer_notifications
FOR EACH ROW EXECUTE FUNCTION legalsos_guard_closed_notification_owner();
