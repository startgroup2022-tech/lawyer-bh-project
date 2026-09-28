DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(name, ', ') INTO missing FROM (VALUES
    ('saraya_rental_requests'), ('saraya_invoices'), ('saraya_invoice_items'),
    ('saraya_payment_demands'), ('saraya_ledger_entries')
  ) expected(name) WHERE to_regclass('public.' || name) IS NULL;
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'Missing Saraya rental finance tables: %', missing; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saraya_rental_requests_property_unit_fk') THEN RAISE EXCEPTION 'Missing saraya_rental_requests_property_unit_fk'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saraya_rental_requests_property_tenant_fk') THEN RAISE EXCEPTION 'Missing saraya_rental_requests_property_tenant_fk'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saraya_invoices_property_request_fk') THEN RAISE EXCEPTION 'Missing saraya_invoices_property_request_fk'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saraya_payment_demands_property_invoice_fk') THEN RAISE EXCEPTION 'Missing saraya_payment_demands_property_invoice_fk'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saraya_ledger_entries_property_invoice_fk') THEN RAISE EXCEPTION 'Missing saraya_ledger_entries_property_invoice_fk'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='saraya_ledger_entries_immutable' AND NOT tgisinternal) THEN RAISE EXCEPTION 'Missing saraya_ledger_entries_immutable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='saraya_invoice_items_immutable' AND NOT tgisinternal) THEN RAISE EXCEPTION 'Missing saraya_invoice_items_immutable'; END IF;
END $$;
