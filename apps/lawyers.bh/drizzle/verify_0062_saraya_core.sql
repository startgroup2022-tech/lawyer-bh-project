DO $$
DECLARE
  expected_tables text[] := ARRAY[
    'saraya_users', 'saraya_properties', 'saraya_property_memberships',
    'saraya_owners', 'saraya_tenant_organizations', 'saraya_contacts',
    'saraya_unit_types', 'saraya_units', 'saraya_audit_logs'
  ];
  table_name text;
  required_name text;
BEGIN
  FOREACH table_name IN ARRAY expected_tables LOOP
    IF to_regclass('public.' || table_name) IS NULL THEN
      RAISE EXCEPTION 'Missing Saraya table: %', table_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'saraya_property_memberships_property_user_key'
      AND contype = 'u'
  ) THEN
    RAISE EXCEPTION 'Missing unique property membership constraint';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('saraya_property_memberships', ARRAY['property_id'], 'saraya_property_memberships_property_id_fkey', 'saraya_properties', ARRAY['id'], 'CASCADE'),
        ('saraya_property_memberships', ARRAY['user_id'], 'saraya_property_memberships_user_id_fkey', 'saraya_users', ARRAY['id'], 'CASCADE'),
        ('saraya_owners', ARRAY['property_id'], 'saraya_owners_property_id_fkey', 'saraya_properties', ARRAY['id'], 'RESTRICT'),
        ('saraya_owners', ARRAY['user_id'], 'saraya_owners_user_id_fkey', 'saraya_users', ARRAY['id'], 'SET NULL'),
        ('saraya_tenant_organizations', ARRAY['property_id'], 'saraya_tenant_organizations_property_id_fkey', 'saraya_properties', ARRAY['id'], 'RESTRICT'),
        ('saraya_contacts', ARRAY['property_id'], 'saraya_contacts_property_id_fkey', 'saraya_properties', ARRAY['id'], 'RESTRICT'),
        ('saraya_contacts', ARRAY['property_id', 'tenant_organization_id'], 'saraya_contacts_property_tenant_fk', 'saraya_tenant_organizations', ARRAY['property_id', 'id'], 'CASCADE'),
        ('saraya_contacts', ARRAY['property_id', 'owner_id'], 'saraya_contacts_property_owner_fk', 'saraya_owners', ARRAY['property_id', 'id'], 'CASCADE'),
        ('saraya_contacts', ARRAY['user_id'], 'saraya_contacts_user_id_fkey', 'saraya_users', ARRAY['id'], 'SET NULL'),
        ('saraya_unit_types', ARRAY['property_id'], 'saraya_unit_types_property_id_fkey', 'saraya_properties', ARRAY['id'], 'CASCADE'),
        ('saraya_units', ARRAY['property_id'], 'saraya_units_property_id_fkey', 'saraya_properties', ARRAY['id'], 'RESTRICT'),
        ('saraya_units', ARRAY['property_id', 'unit_type_id'], 'saraya_units_property_unit_type_fk', 'saraya_unit_types', ARRAY['property_id', 'id'], 'RESTRICT'),
        ('saraya_units', ARRAY['property_id', 'owner_id'], 'saraya_units_property_owner_fk', 'saraya_owners', ARRAY['property_id', 'id'], 'RESTRICT'),
        ('saraya_audit_logs', ARRAY['property_id'], 'saraya_audit_logs_property_id_fkey', 'saraya_properties', ARRAY['id'], 'RESTRICT'),
        ('saraya_audit_logs', ARRAY['actor_user_id'], 'saraya_audit_logs_actor_user_id_fkey', 'saraya_users', ARRAY['id'], 'SET NULL')
    ) expected(source_table, source_columns, constraint_name, target_table, target_columns, delete_rule)
    LEFT JOIN LATERAL (
      SELECT
        source_relation.relname AS source_table,
        array_agg(source_attribute.attname::text ORDER BY key_pair.ordinality) AS source_columns,
        target_relation.relname AS target_table,
        array_agg(target_attribute.attname::text ORDER BY key_pair.ordinality) AS target_columns,
        CASE constraint_record.confdeltype
          WHEN 'a' THEN 'NO ACTION'
          WHEN 'r' THEN 'RESTRICT'
          WHEN 'c' THEN 'CASCADE'
          WHEN 'n' THEN 'SET NULL'
          WHEN 'd' THEN 'SET DEFAULT'
        END AS delete_rule
      FROM pg_constraint constraint_record
      JOIN pg_class source_relation ON source_relation.oid = constraint_record.conrelid
      JOIN pg_namespace source_namespace ON source_namespace.oid = source_relation.relnamespace
      JOIN pg_class target_relation ON target_relation.oid = constraint_record.confrelid
      CROSS JOIN LATERAL unnest(constraint_record.conkey, constraint_record.confkey)
        WITH ORDINALITY AS key_pair(source_attnum, target_attnum, ordinality)
      JOIN pg_attribute source_attribute
        ON source_attribute.attrelid = constraint_record.conrelid
        AND source_attribute.attnum = key_pair.source_attnum
      JOIN pg_attribute target_attribute
        ON target_attribute.attrelid = constraint_record.confrelid
        AND target_attribute.attnum = key_pair.target_attnum
      WHERE source_namespace.nspname = 'public'
        AND constraint_record.contype = 'f'
        AND constraint_record.conname = expected.constraint_name
      GROUP BY source_relation.relname, target_relation.relname, constraint_record.confdeltype
    ) actual ON actual.source_table = expected.source_table
      AND actual.source_columns = expected.source_columns
      AND actual.target_table = expected.target_table
      AND actual.target_columns = expected.target_columns
      AND actual.delete_rule = expected.delete_rule
    WHERE actual.source_table IS NULL
  ) THEN
    RAISE EXCEPTION 'Saraya foreign-key wiring or delete actions are incorrect';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'saraya_users_normalized_email_uidx'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'saraya_users_normalized_phone_uidx'
  ) THEN
    RAISE EXCEPTION 'Missing normalized Saraya identity indexes';
  END IF;

  FOREACH required_name IN ARRAY ARRAY[
    'saraya_users_normalized_email_uidx',
    'saraya_users_normalized_phone_uidx',
    'saraya_property_memberships_user_idx',
    'saraya_owners_user_idx',
    'saraya_contacts_property_tenant_idx',
    'saraya_contacts_property_owner_idx',
    'saraya_contacts_user_idx',
    'saraya_units_property_status_idx',
    'saraya_units_property_unit_type_idx',
    'saraya_units_property_owner_idx',
    'saraya_audit_logs_property_created_idx',
    'saraya_audit_logs_actor_idx'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = required_name
    ) THEN
      RAISE EXCEPTION 'Missing required Saraya index: %', required_name;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint constraint_record
    JOIN pg_class source_table ON source_table.oid = constraint_record.conrelid
    JOIN pg_class target_table ON target_table.oid = constraint_record.confrelid
    WHERE constraint_record.contype = 'f'
      AND source_table.relname LIKE 'saraya\_%' ESCAPE '\'
      AND target_table.relname NOT LIKE 'saraya\_%' ESCAPE '\'
  ) THEN
    RAISE EXCEPTION 'Saraya schema has a foreign key to a non-Saraya table';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('saraya_tenant_organizations', 'saraya_units')
      AND column_name = 'property_id'
      AND is_nullable <> 'NO'
  ) OR (
    SELECT count(*)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('saraya_tenant_organizations', 'saraya_units')
      AND column_name = 'property_id'
  ) <> 2 THEN
    RAISE EXCEPTION 'Tenant organizations and units must have a non-null property scope';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'saraya_unit_types_default_rent_check'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'saraya_units_market_rent_check'
  ) THEN
    RAISE EXCEPTION 'Missing non-negative Saraya monetary constraints';
  END IF;

  FOREACH required_name IN ARRAY ARRAY[
    'saraya_users_identity_check',
    'saraya_users_locale_check',
    'saraya_properties_currency_check',
    'saraya_contacts_one_party_check',
    'saraya_unit_types_default_rent_check',
    'saraya_units_area_check',
    'saraya_units_market_rent_check'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = required_name AND contype = 'c'
    ) THEN
      RAISE EXCEPTION 'Missing required Saraya check: %', required_name;
    END IF;
  END LOOP;

  IF (
    SELECT array_agg(enum_label ORDER BY sort_order)
    FROM (
      SELECT enum_value.enumlabel AS enum_label, enum_value.enumsortorder AS sort_order
      FROM pg_type enum_type
      JOIN pg_enum enum_value ON enum_value.enumtypid = enum_type.oid
      WHERE enum_type.typname = 'saraya_role'
    ) role_values
  ) IS DISTINCT FROM ARRAY[
    'super_admin', 'property_manager', 'accountant', 'maintenance', 'owner', 'tenant'
  ]::text[] THEN
    RAISE EXCEPTION 'saraya_role values are incorrect';
  END IF;

  IF (
    SELECT array_agg(enum_label ORDER BY sort_order)
    FROM (
      SELECT enum_value.enumlabel AS enum_label, enum_value.enumsortorder AS sort_order
      FROM pg_type enum_type
      JOIN pg_enum enum_value ON enum_value.enumtypid = enum_type.oid
      WHERE enum_type.typname = 'saraya_unit_status'
    ) unit_status_values
  ) IS DISTINCT FROM ARRAY[
    'vacant', 'occupied', 'reserved', 'maintenance', 'inactive'
  ]::text[] THEN
    RAISE EXCEPTION 'saraya_unit_status values are incorrect';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('saraya_unit_types', 'default_rent', 14, 3),
        ('saraya_units', 'market_rent', 14, 3),
        ('saraya_units', 'area_square_meters', 12, 3)
    ) expected(table_name, column_name, numeric_precision, numeric_scale)
    LEFT JOIN information_schema.columns actual
      ON actual.table_schema = 'public'
      AND actual.table_name = expected.table_name
      AND actual.column_name = expected.column_name
      AND actual.numeric_precision = expected.numeric_precision
      AND actual.numeric_scale = expected.numeric_scale
    WHERE actual.column_name IS NULL
  ) THEN
    RAISE EXCEPTION 'Saraya numeric precision or scale is incorrect';
  END IF;
END $$;
