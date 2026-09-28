DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM bahrain_lawyers
    WHERE suspension_type = 'license_expired'
      AND status <> 'suspended'
  ) THEN
    RAISE EXCEPTION 'Expired-license accounts must have suspended status';
  END IF;
END
$$;
