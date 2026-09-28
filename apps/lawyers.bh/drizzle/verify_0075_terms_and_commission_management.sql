DO $$
DECLARE
  missing_table text;
  missing_column text;
  missing_constraint text;
  missing_index text;
  missing_seed text;
  missing_permission_count integer;
BEGIN
  SELECT required.table_name INTO missing_table
  FROM (VALUES
    ('terms_versions'),
    ('lawyer_terms_acceptances'),
    ('lawyer_terms_acceptance_requests')
  ) AS required(table_name)
  WHERE to_regclass('public.' || required.table_name) IS NULL
  LIMIT 1;

  IF missing_table IS NOT NULL THEN
    RAISE EXCEPTION 'Missing terms management table: %', missing_table;
  END IF;

  SELECT required.column_name INTO missing_column
  FROM (VALUES
    ('created_by_admin_id'),
    ('updated_by_admin_id'),
    ('published_by_admin_id'),
    ('archived_by_admin_id')
  ) AS required(column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'terms_versions'
      AND columns.column_name = required.column_name
  )
  LIMIT 1;

  IF missing_column IS NOT NULL THEN
    RAISE EXCEPTION 'Missing terms version audit column: %', missing_column;
  END IF;

  SELECT required.constraint_name INTO missing_constraint
  FROM (VALUES
    ('terms_versions_document_type_check'),
    ('terms_versions_status_check'),
    ('terms_versions_content_ar_check'),
    ('terms_versions_content_en_check'),
    ('terms_versions_year_one_percentage_check'),
    ('terms_versions_year_two_percentage_check'),
    ('terms_versions_commission_scope_check'),
    ('lawyer_terms_acceptance_requests_status_check'),
    ('lawyer_terms_acceptance_requests_notification_status_check')
  ) AS required(constraint_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = required.constraint_name
  )
  LIMIT 1;

  IF missing_constraint IS NOT NULL THEN
    RAISE EXCEPTION 'Missing terms management constraint: %', missing_constraint;
  END IF;

  SELECT required.index_name INTO missing_index
  FROM (VALUES
    ('terms_versions_document_version_unique_idx'),
    ('terms_versions_one_published_per_document_idx'),
    ('terms_versions_current_publication_idx'),
    ('lawyer_terms_acceptances_lawyer_version_unique_idx'),
    ('lawyer_terms_acceptance_requests_lawyer_version_unique_idx'),
    ('lawyer_terms_acceptance_requests_pending_idx')
  ) AS required(index_name)
  WHERE to_regclass('public.' || required.index_name) IS NULL
  LIMIT 1;

  IF missing_index IS NOT NULL THEN
    RAISE EXCEPTION 'Missing terms management index: %', missing_index;
  END IF;

  SELECT required.document_type INTO missing_seed
  FROM (VALUES ('general'), ('lawyer_registration')) AS required(document_type)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.terms_versions
    WHERE terms_versions.document_type = required.document_type
      AND terms_versions.status = 'published'
  )
  LIMIT 1;

  IF missing_seed IS NOT NULL THEN
    RAISE EXCEPTION 'Missing published terms seed: %', missing_seed;
  END IF;

  SELECT count(*) INTO missing_permission_count
  FROM public.admin_users
  WHERE role IN ('admin', 'super_admin')
    AND is_active = true
    AND NOT (permissions @> '{"manage_terms_commissions":true}'::jsonb);

  IF missing_permission_count <> 0 THEN
    RAISE EXCEPTION 'Active administrators missing manage_terms_commissions: %', missing_permission_count;
  END IF;
END $$;
