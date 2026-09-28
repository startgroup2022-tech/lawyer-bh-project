ALTER TABLE bahrain_communication_calls ADD COLUMN initiator_data_purged_at timestamptz;
--> statement-breakpoint
CREATE FUNCTION legalsos_preserve_call_erasure() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.initiator_data_purged_at IS NOT NULL THEN
    NEW.initiator_data_purged_at := OLD.initiator_data_purged_at;
  END IF;
  IF NEW.initiator_data_purged_at IS NOT NULL THEN
    NEW.initiator_id := 'deleted:'||NEW.id::text;
    NEW.end_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER legalsos_preserve_call_erasure BEFORE INSERT OR UPDATE ON bahrain_communication_calls
FOR EACH ROW EXECUTE FUNCTION legalsos_preserve_call_erasure();
