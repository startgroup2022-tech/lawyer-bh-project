ALTER TABLE public.bahrain_emergency_case_types
  ADD COLUMN IF NOT EXISTS workflow_type varchar(32)
    DEFAULT 'emergency_dispatch' NOT NULL,
  ADD COLUMN IF NOT EXISTS icon_asset_url text,
  ADD COLUMN IF NOT EXISTS icon_storage_key text,
  ADD COLUMN IF NOT EXISTS created_by_admin_id uuid,
  ADD COLUMN IF NOT EXISTS updated_by_admin_id uuid;

ALTER TABLE public.bahrain_emergency_case_types
  DROP CONSTRAINT IF EXISTS bahrain_emergency_case_types_workflow_check;

ALTER TABLE public.bahrain_emergency_case_types
  ADD CONSTRAINT bahrain_emergency_case_types_workflow_check
  CHECK (workflow_type IN ('emergency_dispatch', 'direct_consultation'));

CREATE INDEX IF NOT EXISTS bahrain_emergency_case_types_workflow_idx
  ON public.bahrain_emergency_case_types (workflow_type, is_active, sort_order);
