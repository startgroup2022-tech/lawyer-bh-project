ALTER TABLE public.bahrain_consultation_methods
  ADD COLUMN IF NOT EXISTS created_by_admin_id uuid,
  ADD COLUMN IF NOT EXISTS updated_by_admin_id uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by_admin_id uuid;

UPDATE public.admin_users
SET
  permissions = jsonb_set(
    COALESCE(permissions, '{}'::jsonb),
    '{manage_consultation_types}',
    'true'::jsonb,
    true
  ),
  permissions_updated_at = now()
WHERE role IN ('admin', 'super_admin')
  AND is_active = true;
