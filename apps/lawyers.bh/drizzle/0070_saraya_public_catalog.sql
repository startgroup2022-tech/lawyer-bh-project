ALTER TABLE public.saraya_unit_types
  ADD COLUMN IF NOT EXISTS catalog_kind varchar(16) NOT NULL DEFAULT 'office';

ALTER TABLE public.saraya_unit_types
  DROP CONSTRAINT IF EXISTS saraya_unit_types_catalog_kind_check;
ALTER TABLE public.saraya_unit_types
  ADD CONSTRAINT saraya_unit_types_catalog_kind_check
  CHECK (catalog_kind IN ('office', 'shop'));

ALTER TABLE public.saraya_units
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS image_key text,
  ADD COLUMN IF NOT EXISTS is_public_listing boolean NOT NULL DEFAULT false;

DO $$
DECLARE
  property_uuid uuid;
  office_type_uuid uuid;
  shop_type_uuid uuid;
BEGIN
  SELECT id INTO property_uuid
  FROM public.saraya_properties
  WHERE code IN ('SARAYA', 'SARAYA-SQUARE')
     OR lower(name_en) = 'saraya square'
  ORDER BY created_at
  LIMIT 1;

  IF property_uuid IS NULL THEN
    INSERT INTO public.saraya_properties
      (code, name_ar, name_en, address_ar, address_en, is_active)
    VALUES
      ('SARAYA-SQUARE', 'سرايا سكوير', 'Saraya Square', 'مدينة عيسى، البحرين', 'Isa Town, Bahrain', true)
    RETURNING id INTO property_uuid;
  ELSE
    UPDATE public.saraya_properties
    SET name_ar = 'سرايا سكوير', name_en = 'Saraya Square', is_active = true, updated_at = now()
    WHERE id = property_uuid;
  END IF;

  INSERT INTO public.saraya_unit_types
    (property_id, name_ar, name_en, catalog_kind, default_rent)
  VALUES (property_uuid, 'مكتب', 'Office', 'office', 450.000)
  ON CONFLICT (property_id, name_en) DO UPDATE
    SET name_ar = EXCLUDED.name_ar, catalog_kind = 'office', updated_at = now()
  RETURNING id INTO office_type_uuid;

  INSERT INTO public.saraya_unit_types
    (property_id, name_ar, name_en, catalog_kind, default_rent)
  VALUES (property_uuid, 'محل', 'Shop', 'shop', 650.000)
  ON CONFLICT (property_id, name_en) DO UPDATE
    SET name_ar = EXCLUDED.name_ar, catalog_kind = 'shop', updated_at = now()
  RETURNING id INTO shop_type_uuid;

  INSERT INTO public.saraya_units
    (property_id, unit_type_id, unit_number, display_name_ar, display_name_en,
     description_ar, description_en, image_key, floor, status,
     area_square_meters, market_rent, is_rentable, is_public_listing)
  VALUES
    (property_uuid, office_type_uuid, '101', 'مكتب ١٠١', 'Office 101', 'مكتب خاص هادئ ومجهز للعمل القانوني اليومي.', 'A quiet private office equipped for daily legal work.', 'office_101', '1', 'vacant', 20, 450, true, true),
    (property_uuid, office_type_uuid, '102', 'مكتب ١٠٢', 'Office 102', 'مكتب خاص بإضاءة طبيعية ومساحة عملية.', 'A private office with natural light and a practical layout.', 'office_102', '1', 'vacant', 22, 475, true, true),
    (property_uuid, office_type_uuid, '103', 'مكتب مشترك ١٠٣', 'Shared Office 103', 'مكتب مشترك مهيأ لثلاثة محامين.', 'A shared office arranged for three lawyers.', 'shared_office_103', '1', 'vacant', 32, 600, true, true),
    (property_uuid, office_type_uuid, '104', 'مكتب مشترك ١٠٤', 'Shared Office 104', 'مكتب مشترك واسع مهيأ لأربعة محامين.', 'A spacious shared office arranged for four lawyers.', 'shared_office_104', '1', 'vacant', 38, 700, true, true),
    (property_uuid, shop_type_uuid, 'SHOP-1', 'محل ١', 'Shop 1', 'محل تجاري بواجهة زجاجية على ممر المجمع.', 'A retail shop with a glass frontage onto the complex walkway.', 'shop_1', 'G', 'vacant', 42, 650, true, true),
    (property_uuid, shop_type_uuid, 'SHOP-2', 'محل ٢', 'Shop 2', 'محل تجاري مرن مناسب للخدمات المتخصصة.', 'A flexible retail unit suited to specialist services.', 'shop_2', 'G', 'vacant', 48, 725, true, true)
  ON CONFLICT (property_id, unit_number) DO UPDATE SET
    unit_type_id = EXCLUDED.unit_type_id,
    display_name_ar = EXCLUDED.display_name_ar,
    display_name_en = EXCLUDED.display_name_en,
    description_ar = EXCLUDED.description_ar,
    description_en = EXCLUDED.description_en,
    image_key = EXCLUDED.image_key,
    floor = EXCLUDED.floor,
    status = EXCLUDED.status,
    area_square_meters = EXCLUDED.area_square_meters,
    market_rent = EXCLUDED.market_rent,
    is_rentable = true,
    is_public_listing = true,
    updated_at = now();
END $$;

CREATE INDEX IF NOT EXISTS saraya_units_public_catalog_idx
  ON public.saraya_units (property_id, status, unit_number)
  WHERE is_public_listing = true AND is_rentable = true;
