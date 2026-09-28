WITH target_properties AS (
  SELECT "id"
  FROM "saraya_properties"
  WHERE "code" IN ('SARAYA-HQ', 'SARAYA-SQUARE')
     OR lower("name_en") = 'saraya square'
     OR "name_ar" = 'سرايا سكوير'
)
INSERT INTO "saraya_virtual_addresses" (
  "property_id",
  "slot_number",
  "code"
)
SELECT
  property."id",
  slots."slot_number",
  'VA-' || lpad(slots."slot_number"::text, 3, '0')
FROM target_properties property
CROSS JOIN generate_series(1, 50) AS slots("slot_number")
ON CONFLICT ("property_id", "slot_number") DO NOTHING;
--> statement-breakpoint
WITH target_properties AS (
  SELECT "id"
  FROM "saraya_properties"
  WHERE "code" IN ('SARAYA-HQ', 'SARAYA-SQUARE')
     OR lower("name_en") = 'saraya square'
     OR "name_ar" = 'سرايا سكوير'
)
INSERT INTO "saraya_meeting_rooms" (
  "property_id",
  "code",
  "name_ar",
  "name_en",
  "description_ar",
  "description_en",
  "capacity",
  "hourly_rate",
  "status"
)
SELECT
  property."id",
  room."code",
  room."name_ar",
  room."name_en",
  room."description_ar",
  room."description_en",
  1,
  0.000,
  'inactive'::"saraya_meeting_room_status"
FROM target_properties property
CROSS JOIN (
  VALUES
    (
      'MR-01',
      'قاعة الاجتماعات 1',
      'Meeting Room 1',
      'بانتظار اعتماد السعة والسعر قبل التفعيل',
      'Capacity and rate must be approved before activation'
    ),
    (
      'MR-02',
      'قاعة الاجتماعات 2',
      'Meeting Room 2',
      'بانتظار اعتماد السعة والسعر قبل التفعيل',
      'Capacity and rate must be approved before activation'
    )
) AS room("code", "name_ar", "name_en", "description_ar", "description_en")
ON CONFLICT ("property_id", "code") DO NOTHING;
