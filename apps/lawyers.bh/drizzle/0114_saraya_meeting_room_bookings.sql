CREATE TYPE "public"."saraya_meeting_room_status" AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE "public"."saraya_meeting_room_booking_status" AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled', 'completed');

CREATE TABLE "saraya_meeting_rooms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "code" varchar(32) NOT NULL,
  "name_ar" text NOT NULL,
  "name_en" text NOT NULL,
  "description_ar" text,
  "description_en" text,
  "capacity" integer NOT NULL,
  "hourly_rate" numeric(14,3) NOT NULL,
  "opening_time" time DEFAULT '08:00:00' NOT NULL,
  "closing_time" time DEFAULT '22:00:00' NOT NULL,
  "minimum_minutes" integer DEFAULT 60 NOT NULL,
  "booking_increment_minutes" integer DEFAULT 30 NOT NULL,
  "status" "saraya_meeting_room_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_meeting_rooms_property_id_key" UNIQUE("property_id", "id"),
  CONSTRAINT "saraya_meeting_rooms_property_code_key" UNIQUE("property_id", "code"),
  CONSTRAINT "saraya_meeting_rooms_capacity_check" CHECK ("capacity" > 0),
  CONSTRAINT "saraya_meeting_rooms_hourly_rate_check" CHECK ("hourly_rate" >= 0),
  CONSTRAINT "saraya_meeting_rooms_hours_check" CHECK ("closing_time" > "opening_time"),
  CONSTRAINT "saraya_meeting_rooms_minimum_check" CHECK ("minimum_minutes" BETWEEN 30 AND 1440),
  CONSTRAINT "saraya_meeting_rooms_increment_check" CHECK ("booking_increment_minutes" IN (15, 30, 60))
);

CREATE TABLE "saraya_meeting_room_bookings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "room_id" uuid NOT NULL,
  "booked_by_user_id" uuid NOT NULL,
  "tenant_organization_id" uuid,
  "status" "saraya_meeting_room_booking_status" DEFAULT 'pending' NOT NULL,
  "start_at" timestamp (3) with time zone NOT NULL,
  "end_at" timestamp (3) with time zone NOT NULL,
  "attendee_count" integer NOT NULL,
  "purpose" text NOT NULL,
  "amount" numeric(14,3) NOT NULL,
  "currency" char(3) DEFAULT 'BHD' NOT NULL,
  "idempotency_key" varchar(128) NOT NULL,
  "decision_reason" text,
  "decided_by_user_id" uuid,
  "decided_at" timestamp (3) with time zone,
  "created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saraya_meeting_room_bookings_property_id_key" UNIQUE("property_id", "id"),
  CONSTRAINT "saraya_meeting_room_bookings_user_idempotency_key" UNIQUE("booked_by_user_id", "idempotency_key"),
  CONSTRAINT "saraya_meeting_room_bookings_time_check" CHECK ("end_at" > "start_at"),
  CONSTRAINT "saraya_meeting_room_bookings_same_day_check" CHECK (("start_at" AT TIME ZONE 'Asia/Bahrain')::date = ("end_at" AT TIME ZONE 'Asia/Bahrain')::date),
  CONSTRAINT "saraya_meeting_room_bookings_attendee_check" CHECK ("attendee_count" > 0),
  CONSTRAINT "saraya_meeting_room_bookings_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "saraya_meeting_room_bookings_currency_check" CHECK ("currency" = 'BHD')
);

ALTER TABLE "saraya_meeting_rooms" ADD CONSTRAINT "saraya_meeting_rooms_property_fk" FOREIGN KEY ("property_id") REFERENCES "public"."saraya_properties"("id") ON DELETE restrict;
ALTER TABLE "saraya_meeting_room_bookings" ADD CONSTRAINT "saraya_meeting_room_bookings_property_room_fk" FOREIGN KEY ("property_id", "room_id") REFERENCES "public"."saraya_meeting_rooms"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_meeting_room_bookings" ADD CONSTRAINT "saraya_meeting_room_bookings_booked_by_fk" FOREIGN KEY ("booked_by_user_id") REFERENCES "public"."saraya_users"("id") ON DELETE restrict;
ALTER TABLE "saraya_meeting_room_bookings" ADD CONSTRAINT "saraya_meeting_room_bookings_property_tenant_fk" FOREIGN KEY ("property_id", "tenant_organization_id") REFERENCES "public"."saraya_tenant_organizations"("property_id", "id") ON DELETE restrict;
ALTER TABLE "saraya_meeting_room_bookings" ADD CONSTRAINT "saraya_meeting_room_bookings_decided_by_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."saraya_users"("id") ON DELETE restrict;

CREATE INDEX "saraya_meeting_rooms_property_status_idx" ON "saraya_meeting_rooms" ("property_id", "status", "code");
CREATE INDEX "saraya_meeting_room_bookings_room_time_idx" ON "saraya_meeting_room_bookings" ("room_id", "start_at", "end_at") WHERE "status" IN ('pending', 'confirmed');
CREATE INDEX "saraya_meeting_room_bookings_property_start_idx" ON "saraya_meeting_room_bookings" ("property_id", "start_at", "status");
CREATE INDEX "saraya_meeting_room_bookings_user_start_idx" ON "saraya_meeting_room_bookings" ("booked_by_user_id", "start_at");

CREATE FUNCTION saraya_prevent_meeting_room_booking_overlap() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.room_id::text, 0));

  IF NEW.status IN ('pending', 'confirmed') AND EXISTS (
    SELECT 1
    FROM saraya_meeting_room_bookings existing
    WHERE existing.room_id = NEW.room_id
      AND existing.id <> NEW.id
      AND existing.status IN ('pending', 'confirmed')
      AND tstzrange(existing.start_at, existing.end_at, '[)') && tstzrange(NEW.start_at, NEW.end_at, '[)')
  ) THEN
    RAISE EXCEPTION 'BOOKING_TIME_CONFLICT' USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "saraya_meeting_room_bookings_no_overlap"
BEFORE INSERT OR UPDATE OF "room_id", "start_at", "end_at", "status"
ON "saraya_meeting_room_bookings"
FOR EACH ROW EXECUTE FUNCTION saraya_prevent_meeting_room_booking_overlap();
