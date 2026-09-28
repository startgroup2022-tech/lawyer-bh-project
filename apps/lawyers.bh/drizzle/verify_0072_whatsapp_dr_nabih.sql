DO $$
DECLARE
  table_count integer;
  unique_count integer;
BEGIN
  SELECT count(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'whatsapp_conversations',
      'whatsapp_processed_events',
      'whatsapp_confirmation_snapshots'
    );

  IF table_count <> 3 THEN
    RAISE EXCEPTION 'WhatsApp assistant table verification failed: % of 3 tables found', table_count;
  END IF;

  SELECT count(*) INTO unique_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'whatsapp_conversations'
    AND indexdef ILIKE '%phone_number_id%customer_wa_id%';

  IF unique_count <> 1 THEN
    RAISE EXCEPTION 'WhatsApp conversation identity constraint is missing';
  END IF;
END $$;
