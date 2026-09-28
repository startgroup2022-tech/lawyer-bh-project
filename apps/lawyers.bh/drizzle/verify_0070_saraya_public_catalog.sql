DO $$
DECLARE
  property_uuid uuid;
  public_count integer;
  shop_count integer;
BEGIN
  SELECT id INTO property_uuid
  FROM public.saraya_properties
  WHERE lower(name_en) = 'saraya square'
  ORDER BY created_at
  LIMIT 1;
  IF property_uuid IS NULL THEN RAISE EXCEPTION 'Saraya Square property missing'; END IF;

  SELECT count(*) INTO public_count
  FROM public.saraya_units
  WHERE property_id = property_uuid AND is_public_listing = true;
  IF public_count <> 6 THEN RAISE EXCEPTION 'Expected 6 public units, found %', public_count; END IF;

  SELECT count(*) INTO shop_count
  FROM public.saraya_units u
  JOIN public.saraya_unit_types t
    ON t.property_id = u.property_id AND t.id = u.unit_type_id
  WHERE u.property_id = property_uuid AND u.is_public_listing = true AND t.catalog_kind = 'shop';
  IF shop_count <> 2 THEN RAISE EXCEPTION 'Expected 2 public shops, found %', shop_count; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'saraya_units_public_catalog_idx'
  ) THEN RAISE EXCEPTION 'Public catalog index missing'; END IF;
END $$;
