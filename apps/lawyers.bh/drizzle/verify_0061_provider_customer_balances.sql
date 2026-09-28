DO $$
BEGIN
  IF to_regclass('public.provider_customer_balances') IS NULL THEN RAISE EXCEPTION 'provider customer balances table is missing'; END IF;
  IF to_regclass('public.payment_allocations_provider_balance_uidx') IS NULL THEN RAISE EXCEPTION 'provider balance allocation unique index is missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bahrain_payment_allocations' AND column_name='provider_balance_id') THEN RAISE EXCEPTION 'provider_balance_id is missing'; END IF;
END $$;
