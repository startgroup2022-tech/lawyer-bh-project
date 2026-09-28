CREATE FUNCTION legalsos_preserve_closed_lawyer_location() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM legalsos_account_lifecycle
    WHERE subject_role='lawyer' AND subject_id=NEW.id) THEN
    NEW.live_location := NULL;
    NEW.live_location_updated_at := NULL;
    NEW.is_emergency_ready := false;
    NEW.location_sharing_enabled := false;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER legalsos_preserve_closed_lawyer_location
BEFORE INSERT OR UPDATE ON bahrain_lawyers
FOR EACH ROW EXECUTE FUNCTION legalsos_preserve_closed_lawyer_location();
