SELECT
  lawyer_id,
  license_expiry_date,
  reminder_kind,
  attempt_count,
  claimed_at,
  sent_at
FROM lawyer_license_notifications
ORDER BY created_at DESC
LIMIT 10;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'lawyer_license_notifications'
ORDER BY indexname;
