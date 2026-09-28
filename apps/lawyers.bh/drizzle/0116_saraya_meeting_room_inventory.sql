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
  property.id,
  room.code,
  room.name_ar,
  room.name_en,
  room.description_ar,
  room.description_en,
  1,
  0.000,
  'inactive'::"saraya_meeting_room_status"
FROM "saraya_properties" property
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
) AS room(code, name_ar, name_en, description_ar, description_en)
WHERE property.code = 'SARAYA-SQUARE'
ON CONFLICT ("property_id", "code") DO NOTHING;
