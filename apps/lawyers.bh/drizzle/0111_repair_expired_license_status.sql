UPDATE bahrain_lawyers
SET
  status = 'suspended',
  is_active = false,
  updated_at = now()
WHERE suspension_type = 'license_expired'
  AND status <> 'suspended';
