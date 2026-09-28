ALTER TABLE discount_redemptions ADD COLUMN customer_data_purged_at timestamptz;
--> statement-breakpoint
CREATE FUNCTION legalsos_preserve_discount_erasure() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE erased_at timestamptz;
BEGIN
  IF TG_OP='UPDATE' AND OLD.customer_data_purged_at IS NOT NULL THEN
    NEW.customer_data_purged_at := OLD.customer_data_purged_at;
  END IF;
  IF NEW.flow='mobile_sos' THEN
    SELECT client_data_purged_at INTO erased_at FROM bahrain_emergency_requests
      WHERE id=NEW.emergency_request_id FOR SHARE;
    NEW.customer_data_purged_at := COALESCE(NEW.customer_data_purged_at,erased_at);
  END IF;
  IF TG_OP='UPDATE' AND OLD.flow='mobile_sos' AND NEW.customer_data_purged_at IS NULL THEN
    SELECT client_data_purged_at INTO erased_at FROM bahrain_emergency_requests
      WHERE id=OLD.emergency_request_id FOR SHARE;
    NEW.customer_data_purged_at := erased_at;
  END IF;
  IF NEW.customer_data_purged_at IS NOT NULL THEN
    NEW.user_key := 'deleted:'||NEW.id::text;
    NEW.tap_charge_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER legalsos_preserve_discount_erasure BEFORE INSERT OR UPDATE ON discount_redemptions
FOR EACH ROW EXECUTE FUNCTION legalsos_preserve_discount_erasure();
