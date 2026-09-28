SELECT count(*) AS approved_without_membership_number
FROM public.bahrain_lawyers
WHERE status = 'approved'
  AND NULLIF(btrim(membership_no), '') IS NULL;

SELECT membership_no, count(*) AS duplicate_count
FROM public.bahrain_lawyers
WHERE membership_no IS NOT NULL
GROUP BY membership_no
HAVING count(*) > 1;

SELECT
  id,
  full_name_ar,
  membership_no,
  status,
  is_active
FROM public.bahrain_lawyers
WHERE status = 'approved'
ORDER BY created_at, id;
