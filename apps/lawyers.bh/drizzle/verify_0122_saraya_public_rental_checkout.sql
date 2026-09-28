DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(name, ', ')
    INTO missing
    FROM (VALUES
      ('saraya_viewing_slots'),
      ('saraya_viewing_appointments'),
      ('saraya_viewing_commands'),
      ('saraya_lease_signature_requests')
    ) expected(name)
   WHERE to_regclass('public.' || name) IS NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Saraya public rental checkout tables: %', missing;
  END IF;

  SELECT string_agg(table_name || '.' || column_name, ', ')
    INTO missing
    FROM (VALUES
      ('saraya_properties', 'rental_approval_mode'),
      ('saraya_units', 'rental_approval_override'),
      ('saraya_viewing_slots', 'unit_scope_id'),
      ('saraya_viewing_appointments', 'slot_unit_scope_id'),
      ('saraya_viewing_commands', 'property_id'),
      ('saraya_viewing_commands', 'actor_user_id'),
      ('saraya_viewing_commands', 'idempotency_key'),
      ('saraya_viewing_commands', 'action'),
      ('saraya_viewing_commands', 'entity_type'),
      ('saraya_viewing_commands', 'entity_id'),
      ('saraya_viewing_commands', 'normalized_input_hash'),
      ('saraya_viewing_commands', 'normalized_input'),
      ('saraya_viewing_commands', 'result'),
      ('saraya_viewing_commands', 'created_at'),
      ('saraya_viewing_commands', 'updated_at'),
      ('saraya_rental_requests', 'resolved_approval_mode'),
      ('saraya_rental_requests', 'applicant_type'),
      ('saraya_rental_requests', 'applicant_name_ar'),
      ('saraya_rental_requests', 'applicant_name_en'),
      ('saraya_rental_requests', 'registration_number'),
      ('saraya_rental_requests', 'lease_id'),
      ('saraya_rental_requests', 'checkout_expires_at'),
      ('saraya_payment_demands', 'payment_method'),
      ('saraya_payment_demands', 'provider'),
      ('saraya_payment_demands', 'provider_reference'),
      ('saraya_payment_demands', 'receipt_document_id'),
      ('saraya_payment_demands', 'verified_by_user_id'),
      ('saraya_payment_demands', 'verified_at'),
      ('saraya_payment_demands', 'failure_code')
    ) expected(table_name, column_name)
   WHERE NOT EXISTS (
     SELECT 1
       FROM information_schema.columns columns
      WHERE columns.table_schema = 'public'
        AND columns.table_name = expected.table_name
        AND columns.column_name = expected.column_name
   );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Saraya public rental checkout columns: %', missing;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns columns
     WHERE columns.table_schema = 'public'
       AND columns.table_name = 'saraya_viewing_slots'
       AND columns.column_name = 'unit_scope_id'
       AND columns.is_generated = 'ALWAYS'
  ) OR NOT EXISTS (
    SELECT 1
      FROM pg_attribute attribute
      JOIN pg_class generated_table ON generated_table.oid = attribute.attrelid
      JOIN pg_namespace generated_schema ON generated_schema.oid = generated_table.relnamespace
      JOIN pg_attrdef generated_default
        ON generated_default.adrelid = attribute.attrelid
       AND generated_default.adnum = attribute.attnum
     WHERE generated_schema.nspname = 'public'
       AND generated_table.relname = 'saraya_viewing_slots'
       AND attribute.attname = 'unit_scope_id'
       AND attribute.attgenerated = 's'
       AND replace(pg_get_expr(generated_default.adbin, generated_default.adrelid), '"', '')
           LIKE 'COALESCE(unit_id, %00000000-0000-0000-0000-000000000000%uuid)%'
  ) THEN
    RAISE EXCEPTION 'saraya_viewing_slots.unit_scope_id is not the required stored generated COALESCE(unit_id, zero UUID) expression';
  END IF;

  SELECT string_agg(table_name || '.' || name, ', ')
    INTO missing
    FROM (VALUES
      ('saraya_viewing_slots', 'saraya_viewing_slots_time_check'),
      ('saraya_viewing_slots', 'saraya_viewing_slots_capacity_check'),
      ('saraya_viewing_slots', 'saraya_viewing_slots_status_check'),
      ('saraya_viewing_appointments', 'saraya_viewing_appointments_status_check'),
      ('saraya_viewing_appointments', 'saraya_viewing_appointments_locale_check'),
      ('saraya_viewing_appointments', 'saraya_viewing_appointments_slot_unit_scope_check'),
      ('saraya_viewing_commands', 'saraya_viewing_commands_idempotency_key_check'),
      ('saraya_viewing_commands', 'saraya_viewing_commands_action_check'),
      ('saraya_viewing_commands', 'saraya_viewing_commands_entity_type_check'),
      ('saraya_viewing_commands', 'saraya_viewing_commands_input_hash_check'),
      ('saraya_viewing_commands', 'saraya_viewing_commands_result_check'),
      ('saraya_properties', 'saraya_properties_rental_approval_mode_check'),
      ('saraya_units', 'saraya_units_rental_approval_override_check'),
      ('saraya_units', 'saraya_units_reserved_zero_id_check'),
      ('saraya_rental_requests', 'saraya_rental_requests_resolved_approval_mode_check'),
      ('saraya_rental_requests', 'saraya_rental_requests_applicant_type_check'),
      ('saraya_rental_requests', 'saraya_rental_requests_company_registration_check'),
      ('saraya_payment_demands', 'saraya_payment_demands_payment_method_check'),
      ('saraya_lease_signature_requests', 'saraya_lease_signature_requests_signer_role_check'),
      ('saraya_lease_signature_requests', 'saraya_lease_signature_requests_status_check'),
      ('saraya_lease_signature_requests', 'saraya_lease_signature_requests_signed_proof_check'),
      ('saraya_auth_challenges', 'saraya_auth_challenges_purpose_check')
    ) expected(table_name, name)
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_constraint constraint_row
       JOIN pg_class constraint_table ON constraint_table.oid = constraint_row.conrelid
       JOIN pg_namespace constraint_schema ON constraint_schema.oid = constraint_table.relnamespace
      WHERE constraint_schema.nspname = 'public'
        AND constraint_table.relname = expected.table_name
        AND constraint_row.conname = expected.name
   );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Saraya public rental checkout checks: %', missing;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint constraint_row
      JOIN pg_class constraint_table ON constraint_table.oid = constraint_row.conrelid
      JOIN pg_namespace constraint_schema ON constraint_schema.oid = constraint_table.relnamespace
     WHERE constraint_schema.nspname = 'public'
       AND constraint_table.relname = 'saraya_units'
       AND constraint_row.conname = 'saraya_units_reserved_zero_id_check'
       AND replace(pg_get_constraintdef(constraint_row.oid), '"', '')
           LIKE '%id <>%00000000-0000-0000-0000-000000000000%uuid%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_units_reserved_zero_id_check definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint constraint_row
      JOIN pg_class constraint_table ON constraint_table.oid = constraint_row.conrelid
      JOIN pg_namespace constraint_schema ON constraint_schema.oid = constraint_table.relnamespace
     WHERE constraint_schema.nspname = 'public'
       AND constraint_table.relname = 'saraya_viewing_commands'
       AND constraint_row.conname = 'saraya_viewing_commands_idempotency_key_check'
       AND replace(pg_get_constraintdef(constraint_row.oid), '"', '')
           LIKE '%NULLIF(btrim(%idempotency_key%IS NOT NULL%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_viewing_commands_idempotency_key_check definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint constraint_row
      JOIN pg_class constraint_table ON constraint_table.oid = constraint_row.conrelid
      JOIN pg_namespace constraint_schema ON constraint_schema.oid = constraint_table.relnamespace
     WHERE constraint_schema.nspname = 'public'
       AND constraint_table.relname = 'saraya_viewing_commands'
       AND constraint_row.conname = 'saraya_viewing_commands_action_check'
       AND replace(pg_get_constraintdef(constraint_row.oid), '"', '')
           LIKE '%action%viewing_slot.create%viewing_slot.update%viewing_appointment.status%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_viewing_commands_action_check definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint constraint_row
      JOIN pg_class constraint_table ON constraint_table.oid = constraint_row.conrelid
      JOIN pg_namespace constraint_schema ON constraint_schema.oid = constraint_table.relnamespace
     WHERE constraint_schema.nspname = 'public'
       AND constraint_table.relname = 'saraya_viewing_commands'
       AND constraint_row.conname = 'saraya_viewing_commands_entity_type_check'
       AND replace(pg_get_constraintdef(constraint_row.oid), '"', '')
           LIKE '%entity_type%viewing_slot%viewing_appointment%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_viewing_commands_entity_type_check definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint constraint_row
      JOIN pg_class constraint_table ON constraint_table.oid = constraint_row.conrelid
      JOIN pg_namespace constraint_schema ON constraint_schema.oid = constraint_table.relnamespace
     WHERE constraint_schema.nspname = 'public'
       AND constraint_table.relname = 'saraya_viewing_commands'
       AND constraint_row.conname = 'saraya_viewing_commands_input_hash_check'
       AND replace(pg_get_constraintdef(constraint_row.oid), '"', '')
           LIKE '%normalized_input_hash%^[0-9a-f]{64}$%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_viewing_commands_input_hash_check definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint constraint_row
      JOIN pg_class constraint_table ON constraint_table.oid = constraint_row.conrelid
      JOIN pg_namespace constraint_schema ON constraint_schema.oid = constraint_table.relnamespace
     WHERE constraint_schema.nspname = 'public'
       AND constraint_table.relname = 'saraya_viewing_commands'
       AND constraint_row.conname = 'saraya_viewing_commands_result_check'
       AND replace(pg_get_constraintdef(constraint_row.oid), '"', '')
           LIKE '%jsonb_typeof(result)%object%entityId%status%result - ARRAY%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_viewing_commands_result_check definition';
  END IF;

  SELECT string_agg(table_name || '.' || name, ', ')
    INTO missing
    FROM (VALUES
      ('saraya_viewing_slots', 'saraya_viewing_slots_property_unit_fk'),
      ('saraya_viewing_appointments', 'saraya_viewing_appointments_property_slot_unit_fk'),
      ('saraya_viewing_appointments', 'saraya_viewing_appointments_property_unit_fk'),
      ('saraya_viewing_commands', 'saraya_viewing_commands_property_fk'),
      ('saraya_viewing_commands', 'saraya_viewing_commands_actor_fk'),
      ('saraya_rental_requests', 'saraya_rental_requests_property_lease_fk'),
      ('saraya_payment_demands', 'saraya_payment_demands_property_receipt_fk'),
      ('saraya_lease_signature_requests', 'saraya_lease_signature_requests_property_lease_fk')
    ) expected(table_name, name)
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_constraint constraint_row
       JOIN pg_class constraint_table ON constraint_table.oid = constraint_row.conrelid
       JOIN pg_namespace constraint_schema ON constraint_schema.oid = constraint_table.relnamespace
      WHERE constraint_schema.nspname = 'public'
        AND constraint_table.relname = expected.table_name
        AND constraint_row.conname = expected.name
   );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Saraya public rental checkout property-scoped foreign keys: %', missing;
  END IF;

  SELECT string_agg(name, ', ')
    INTO missing
    FROM (VALUES
      ('saraya_viewing_slots_active_start_idx'),
      ('saraya_viewing_appointments_idempotency_uidx'),
      ('saraya_viewing_appointments_property_status_created_idx'),
      ('saraya_viewing_commands_actor_key_uidx'),
      ('saraya_viewing_commands_property_entity_idx'),
      ('saraya_rental_requests_active_unit_uidx'),
      ('saraya_rental_requests_property_lease_uidx'),
      ('saraya_payment_demands_provider_reference_uidx'),
      ('saraya_lease_signature_requests_property_lease_status_idx'),
      ('saraya_lease_signature_requests_signer_status_idx')
    ) expected(name)
   WHERE to_regclass('public.' || name) IS NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Saraya public rental checkout indexes: %', missing;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_indexes index_row
     WHERE index_row.schemaname = 'public'
       AND index_row.tablename = 'saraya_viewing_slots'
       AND index_row.indexname = 'saraya_viewing_slots_active_start_idx'
       AND replace(pg_get_indexdef(to_regclass('public.' || index_row.indexname)), '"', '')
           LIKE '%(property_id, unit_id, status, start_at)%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_viewing_slots_active_start_idx definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_indexes index_row
     WHERE index_row.schemaname = 'public'
       AND index_row.tablename = 'saraya_viewing_commands'
       AND index_row.indexname = 'saraya_viewing_commands_actor_key_uidx'
       AND pg_get_indexdef(to_regclass('public.' || index_row.indexname)) LIKE '%UNIQUE INDEX%'
       AND replace(pg_get_indexdef(to_regclass('public.' || index_row.indexname)), '"', '')
           LIKE '%(actor_user_id, idempotency_key)%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_viewing_commands_actor_key_uidx definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_indexes index_row
     WHERE index_row.schemaname = 'public'
       AND index_row.tablename = 'saraya_viewing_commands'
       AND index_row.indexname = 'saraya_viewing_commands_property_entity_idx'
       AND replace(pg_get_indexdef(to_regclass('public.' || index_row.indexname)), '"', '')
           LIKE '%(property_id, entity_type, entity_id)%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_viewing_commands_property_entity_idx definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_indexes index_row
     WHERE index_row.schemaname = 'public'
       AND index_row.tablename = 'saraya_rental_requests'
       AND index_row.indexname = 'saraya_rental_requests_property_lease_uidx'
       AND pg_get_indexdef(to_regclass('public.' || index_row.indexname)) LIKE '%UNIQUE INDEX%'
       AND regexp_replace(pg_get_indexdef(to_regclass('public.' || index_row.indexname)), '[()"]', '', 'g')
           LIKE '%property_id, lease_id%WHERE lease_id IS NOT NULL%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_rental_requests_property_lease_uidx definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_indexes index_row
     WHERE index_row.schemaname = 'public'
       AND index_row.tablename = 'saraya_payment_demands'
       AND index_row.indexname = 'saraya_payment_demands_provider_reference_uidx'
       AND pg_get_indexdef(to_regclass('public.' || index_row.indexname)) LIKE '%UNIQUE INDEX%'
       AND regexp_replace(pg_get_indexdef(to_regclass('public.' || index_row.indexname)), '[()"]', '', 'g')
           LIKE '%provider, provider_reference%WHERE provider_reference IS NOT NULL%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_payment_demands_provider_reference_uidx definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_indexes index_row
     WHERE index_row.schemaname = 'public'
       AND index_row.tablename = 'saraya_lease_signature_requests'
       AND index_row.indexname = 'saraya_lease_signature_requests_property_lease_status_idx'
       AND replace(pg_get_indexdef(to_regclass('public.' || index_row.indexname)), '"', '')
           LIKE '%(property_id, lease_id, status)%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_lease_signature_requests_property_lease_status_idx definition';
  END IF;

  SELECT string_agg(name, ', ')
    INTO missing
    FROM (VALUES
      (
        'saraya_viewing_slots',
        'saraya_viewing_slots_property_unit_fk',
        'FOREIGN KEY (property_id, unit_id) REFERENCES saraya_units(property_id, id) ON DELETE RESTRICT'
      ),
      (
        'saraya_viewing_appointments',
        'saraya_viewing_appointments_property_slot_unit_fk',
        'FOREIGN KEY (property_id, slot_id, slot_unit_scope_id) REFERENCES saraya_viewing_slots(property_id, id, unit_scope_id) ON DELETE RESTRICT'
      ),
      (
        'saraya_viewing_appointments',
        'saraya_viewing_appointments_property_unit_fk',
        'FOREIGN KEY (property_id, unit_id) REFERENCES saraya_units(property_id, id) ON DELETE RESTRICT'
      ),
      (
        'saraya_viewing_commands',
        'saraya_viewing_commands_property_fk',
        'FOREIGN KEY (property_id) REFERENCES saraya_properties(id) ON DELETE RESTRICT'
      ),
      (
        'saraya_viewing_commands',
        'saraya_viewing_commands_actor_fk',
        'FOREIGN KEY (actor_user_id) REFERENCES saraya_users(id) ON DELETE RESTRICT'
      ),
      (
        'saraya_rental_requests',
        'saraya_rental_requests_property_lease_fk',
        'FOREIGN KEY (property_id, lease_id) REFERENCES saraya_leases(property_id, id) ON DELETE RESTRICT'
      ),
      (
        'saraya_payment_demands',
        'saraya_payment_demands_property_receipt_fk',
        'FOREIGN KEY (property_id, receipt_document_id) REFERENCES saraya_documents(property_id, id) ON DELETE RESTRICT'
      ),
      (
        'saraya_lease_signature_requests',
        'saraya_lease_signature_requests_property_lease_fk',
        'FOREIGN KEY (property_id, lease_id) REFERENCES saraya_leases(property_id, id) ON DELETE RESTRICT'
      )
    ) expected(table_name, name, definition)
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_constraint constraint_row
       JOIN pg_class constraint_table ON constraint_table.oid = constraint_row.conrelid
       JOIN pg_namespace constraint_schema ON constraint_schema.oid = constraint_table.relnamespace
      WHERE constraint_schema.nspname = 'public'
        AND constraint_table.relname = expected.table_name
        AND constraint_row.conname = expected.name
        AND replace(pg_get_constraintdef(constraint_row.oid), '"', '') LIKE '%' || expected.definition || '%'
   );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Incorrect Saraya public rental checkout foreign key definitions: %', missing;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint constraint_row
      JOIN pg_class constraint_table ON constraint_table.oid = constraint_row.conrelid
      JOIN pg_namespace constraint_schema ON constraint_schema.oid = constraint_table.relnamespace
     WHERE constraint_schema.nspname = 'public'
       AND constraint_table.relname = 'saraya_viewing_slots'
       AND constraint_row.conname = 'saraya_viewing_slots_capacity_check'
       AND regexp_replace(pg_get_constraintdef(constraint_row.oid), '[()"]', '', 'g')
           LIKE '%capacity > 0 AND booked_count >= 0 AND booked_count <= capacity%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_viewing_slots_capacity_check definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint constraint_row
      JOIN pg_class constraint_table ON constraint_table.oid = constraint_row.conrelid
      JOIN pg_namespace constraint_schema ON constraint_schema.oid = constraint_table.relnamespace
     WHERE constraint_schema.nspname = 'public'
       AND constraint_table.relname = 'saraya_viewing_appointments'
       AND constraint_row.conname = 'saraya_viewing_appointments_slot_unit_scope_check'
       AND replace(pg_get_constraintdef(constraint_row.oid), '"', '') LIKE '%slot_unit_scope_id%unit_id%00000000-0000-0000-0000-000000000000%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_viewing_appointments_slot_unit_scope_check definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_indexes index_row
     WHERE index_row.schemaname = 'public'
       AND index_row.indexname = 'saraya_rental_requests_active_unit_uidx'
       AND regexp_replace(pg_get_indexdef(to_regclass('public.' || index_row.indexname)), '[()"]', '', 'g')
           LIKE '%UNIQUE INDEX%saraya_rental_requests_active_unit_uidx%property_id, unit_id%WHERE status = ANY%'
       AND pg_get_indexdef(to_regclass('public.' || index_row.indexname)) LIKE '%pending_owner_review%'
       AND pg_get_indexdef(to_regclass('public.' || index_row.indexname)) LIKE '%approved_awaiting_payment%'
       AND pg_get_indexdef(to_regclass('public.' || index_row.indexname)) LIKE '%paid_awaiting_signature%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_rental_requests_active_unit_uidx definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_indexes index_row
     WHERE index_row.schemaname = 'public'
       AND index_row.indexname = 'saraya_viewing_appointments_idempotency_uidx'
       AND pg_get_indexdef(to_regclass('public.' || index_row.indexname)) LIKE '%UNIQUE INDEX%'
       AND replace(pg_get_indexdef(to_regclass('public.' || index_row.indexname)), '"', '')
           LIKE '%(idempotency_key)%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_viewing_appointments_idempotency_uidx definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_indexes index_row
     WHERE index_row.schemaname = 'public'
       AND index_row.indexname = 'saraya_viewing_appointments_property_status_created_idx'
       AND replace(pg_get_indexdef(to_regclass('public.' || index_row.indexname)), '"', '')
           LIKE '%(property_id, status, created_at DESC)%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_viewing_appointments_property_status_created_idx definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_indexes index_row
     WHERE index_row.schemaname = 'public'
       AND index_row.indexname = 'saraya_lease_signature_requests_signer_status_idx'
       AND replace(pg_get_indexdef(to_regclass('public.' || index_row.indexname)), '"', '')
           LIKE '%(signer_user_id, status, created_at DESC)%'
  ) THEN
    RAISE EXCEPTION 'Incorrect saraya_lease_signature_requests_signer_status_idx definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint constraint_row
      JOIN pg_class constraint_table ON constraint_table.oid = constraint_row.conrelid
      JOIN pg_namespace constraint_schema ON constraint_schema.oid = constraint_table.relnamespace
     WHERE constraint_schema.nspname = 'public'
       AND constraint_table.relname = 'saraya_auth_challenges'
       AND constraint_row.conname = 'saraya_auth_challenges_purpose_check'
       AND pg_get_constraintdef(constraint_row.oid) LIKE '%public_rental_otp%'
  ) THEN
    RAISE EXCEPTION 'saraya_auth_challenges_purpose_check does not allow public_rental_otp';
  END IF;
END $$;
