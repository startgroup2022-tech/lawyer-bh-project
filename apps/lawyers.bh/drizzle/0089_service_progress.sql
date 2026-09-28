ALTER TYPE service_status ADD VALUE IF NOT EXISTS 'in_progress';
--> statement-breakpoint
-- The migration runner holds this lock until the entire migration commits.
LOCK TABLE bahrain_emergency_requests IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
CREATE TABLE bahrain_emergency_active_counts (
  lawyer_id text PRIMARY KEY,
  active_count bigint NOT NULL CHECK (active_count >= 0)
);
--> statement-breakpoint
INSERT INTO bahrain_emergency_active_counts (lawyer_id, active_count)
SELECT assigned_lawyer_id::text, count(*)
FROM bahrain_emergency_requests
WHERE assigned_lawyer_id IS NOT NULL
AND service_status NOT IN ('completed','cancelled','disputed')
GROUP BY assigned_lawyer_id;
--> statement-breakpoint
CREATE FUNCTION guard_bahrain_emergency_assignment() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  old_owner text;
  new_owner text;
  acquired text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    IF OLD.service_status NOT IN ('completed','cancelled','disputed') THEN
      old_owner := OLD.assigned_lawyer_id::text;
    END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    IF NEW.service_status NOT IN ('completed','cancelled','disputed') THEN
      new_owner := NEW.assigned_lawyer_id::text;
    END IF;
  END IF;
  IF old_owner IS DISTINCT FROM new_owner THEN
    IF old_owner IS NOT NULL THEN
      UPDATE bahrain_emergency_active_counts SET active_count = active_count - 1
      WHERE lawyer_id = old_owner;
    END IF;
    IF new_owner IS NOT NULL THEN
      -- Unique counter row serializes concurrent assignments, including retries.
      INSERT INTO bahrain_emergency_active_counts AS occupancy (lawyer_id, active_count)
      VALUES (new_owner, 1)
      ON CONFLICT (lawyer_id) DO UPDATE SET active_count = 1
      WHERE occupancy.active_count = 0
      RETURNING lawyer_id INTO acquired;
      IF acquired IS NULL THEN
        RAISE EXCEPTION 'lawyer_busy' USING ERRCODE = '23505',
          CONSTRAINT = 'bahrain_emergency_one_active_lawyer';
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER bahrain_emergency_assignment_guard
BEFORE INSERT OR UPDATE OF assigned_lawyer_id, service_status OR DELETE
ON bahrain_emergency_requests
FOR EACH ROW EXECUTE FUNCTION guard_bahrain_emergency_assignment();
--> statement-breakpoint
DROP INDEX IF EXISTS bahrain_emergency_one_active_lawyer;
DROP INDEX IF EXISTS bahrain_emergency_active_lawyer;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS bahrain_emergency_one_active_lawyer
ON bahrain_emergency_requests (assigned_lawyer_id)
WHERE assigned_lawyer_id IS NOT NULL
AND service_status NOT IN ('completed','cancelled','disputed');
