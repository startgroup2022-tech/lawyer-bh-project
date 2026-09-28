ALTER TABLE discount_codes ADD COLUMN scope varchar(16) NOT NULL DEFAULT 'website';
ALTER TABLE discount_codes ADD CONSTRAINT discount_codes_scope_check CHECK (scope IN ('website', 'app', 'both'));
ALTER TABLE discount_redemptions ADD COLUMN emergency_request_id uuid REFERENCES bahrain_emergency_requests(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX discount_redemptions_emergency_unique ON discount_redemptions(emergency_request_id);

-- Synchronize only server-confirmed capture. Keep pending/failed SDK sessions
-- reserved because a delayed capture or retry can still arrive for that session.
CREATE FUNCTION sync_mobile_discount_capture() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tap_status = 'CAPTURED' AND NEW.payment_status = 'success' THEN
    UPDATE discount_redemptions SET status='redeemed', redeemed_at=COALESCE(redeemed_at,now()),
      tap_charge_id=NEW.tap_charge_id, updated_at=now()
      WHERE emergency_request_id=NEW.id AND status='reserved';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER mobile_discount_capture AFTER UPDATE OF payment_status,tap_status ON bahrain_emergency_requests
  FOR EACH ROW EXECUTE FUNCTION sync_mobile_discount_capture();
