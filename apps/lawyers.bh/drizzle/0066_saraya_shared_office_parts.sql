ALTER TABLE "saraya_units" ADD COLUMN "parent_unit_id" uuid;
ALTER TABLE "saraya_units" ADD COLUMN "is_rentable" boolean DEFAULT true NOT NULL;
ALTER TABLE "saraya_units" ADD COLUMN "part_order" integer;
ALTER TABLE "saraya_units" ADD COLUMN "display_name_ar" text;
ALTER TABLE "saraya_units" ADD COLUMN "display_name_en" text;

ALTER TABLE "saraya_units" ADD CONSTRAINT "saraya_units_property_parent_fk"
  FOREIGN KEY ("property_id", "parent_unit_id")
  REFERENCES "public"."saraya_units"("property_id", "id") ON DELETE RESTRICT;

ALTER TABLE "saraya_units" ADD CONSTRAINT "saraya_units_part_order_check"
  CHECK (("parent_unit_id" IS NULL AND "part_order" IS NULL) OR
         ("parent_unit_id" IS NOT NULL AND "part_order" BETWEEN 1 AND 10));
ALTER TABLE "saraya_units" ADD CONSTRAINT "saraya_units_part_names_check"
  CHECK ("parent_unit_id" IS NULL OR
         (NULLIF(BTRIM("display_name_ar"), '') IS NOT NULL AND
          NULLIF(BTRIM("display_name_en"), '') IS NOT NULL));
ALTER TABLE "saraya_units" ADD CONSTRAINT "saraya_units_parent_rentable_check"
  CHECK ("parent_unit_id" IS NULL OR "is_rentable");

CREATE UNIQUE INDEX "saraya_units_property_parent_order_uidx"
  ON "saraya_units" ("property_id", "parent_unit_id", "part_order")
  WHERE "parent_unit_id" IS NOT NULL;
CREATE UNIQUE INDEX "saraya_units_property_parent_name_uidx"
  ON "saraya_units" ("property_id", "parent_unit_id", LOWER("display_name_ar"))
  WHERE "parent_unit_id" IS NOT NULL;
CREATE INDEX "saraya_units_property_parent_order_idx"
  ON "saraya_units" ("property_id", "parent_unit_id", "part_order");
