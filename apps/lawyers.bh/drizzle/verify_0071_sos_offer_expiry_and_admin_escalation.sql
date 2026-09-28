SELECT admin_escalated_at
FROM public.bahrain_emergency_requests
LIMIT 0;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'bahrain_emergency_requests_offer_expiry_idx',
    'bahrain_emergency_requests_admin_escalation_idx'
  );
