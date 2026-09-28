LOCK TABLE public.bahrain_lawyers IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
DO $$
DECLARE
  sequence_floor bigint;
BEGIN
  SELECT GREATEST(
    1000,
    COALESCE(
      MAX(
        CASE
          WHEN membership_no ~ '^LBH-[0-9]+$'
          THEN substring(membership_no FROM '[0-9]+$')::bigint
          ELSE NULL
        END
      ),
      1000
    ),
    (
      SELECT CASE WHEN is_called THEN last_value ELSE last_value - 1 END
      FROM public.bahrain_lawyers_membership_no_seq
    )
  )
  INTO sequence_floor
  FROM public.bahrain_lawyers;

  PERFORM setval(
    'public.bahrain_lawyers_membership_no_seq'::regclass,
    sequence_floor,
    true
  );
END $$;
--> statement-breakpoint
WITH eligible AS MATERIALIZED (
  SELECT id
  FROM public.bahrain_lawyers
  WHERE status = 'approved'
    AND NULLIF(btrim(membership_no), '') IS NULL
  ORDER BY created_at, id
), numbered AS MATERIALIZED (
  SELECT
    id,
    'LBH-' || lpad(
      nextval('public.bahrain_lawyers_membership_no_seq'::regclass)::text,
      6,
      '0'
    ) AS membership_no
  FROM eligible
)
UPDATE public.bahrain_lawyers AS lawyer
SET membership_no = numbered.membership_no,
    updated_at = now()
FROM numbered
WHERE lawyer.id = numbered.id;
--> statement-breakpoint
ALTER TABLE public.bahrain_lawyers
  ADD CONSTRAINT bahrain_lawyers_approved_membership_no_check
  CHECK (
    status <> 'approved'
    OR NULLIF(btrim(membership_no), '') IS NOT NULL
  ) NOT VALID;
--> statement-breakpoint
ALTER TABLE public.bahrain_lawyers
  VALIDATE CONSTRAINT bahrain_lawyers_approved_membership_no_check;
