DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'saraya_units_property_parent_fk'
      AND conrelid = 'public.saraya_units'::regclass
      AND confrelid = 'public.saraya_units'::regclass
  ) THEN
    RAISE EXCEPTION 'Missing property-scoped parent unit foreign key';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'saraya_units_property_parent_order_idx'
  ) THEN
    RAISE EXCEPTION 'Missing parent unit lookup index';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.saraya_units child
    JOIN public.saraya_units parent
      ON parent.property_id = child.property_id
     AND parent.id = child.parent_unit_id
    WHERE parent.parent_unit_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Nested office parts are not allowed';
  END IF;
END $$;
