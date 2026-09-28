import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "drizzle/0114_saraya_meeting_room_bookings.sql";
const verifyPath = "drizzle/verify_0114_saraya_meeting_room_bookings.sql";
const migration = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";
const verify = existsSync(verifyPath) ? readFileSync(verifyPath, "utf8") : "";
const schema = readFileSync("lib/db/saraya-schema.ts", "utf8");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as {
  entries: Array<{ idx: number; tag: string }>;
};

describe("0114 Saraya meeting-room booking migration contract", () => {
  it.each(["saraya_meeting_rooms", "saraya_meeting_room_bookings"])(
    "creates, verifies, and maps %s",
    (table) => {
      expect(migration).toContain(`CREATE TABLE "${table}"`);
      expect(verify).toContain(table);
      expect(schema).toContain(`"${table}"`);
    },
  );

  it("keeps rooms, bookings, users, and tenant organizations inside one property", () => {
    for (const constraint of [
      "saraya_meeting_rooms_property_id_key",
      "saraya_meeting_room_bookings_property_room_fk",
      "saraya_meeting_room_bookings_property_tenant_fk",
      "saraya_meeting_room_bookings_booked_by_fk",
    ]) {
      expect(migration).toContain(`CONSTRAINT "${constraint}"`);
      expect(verify).toContain(constraint);
    }
  });

  it("stores three-decimal BHD prices and valid half-open booking ranges", () => {
    expect(migration).toContain('"hourly_rate" numeric(14,3)');
    expect(migration).toContain('"amount" numeric(14,3)');
    expect(migration).toContain('"currency" char(3) DEFAULT \'BHD\' NOT NULL');
    expect(migration).toContain('CHECK ("end_at" > "start_at")');
  });

  it("serializes writes per room and rejects overlapping active bookings", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("tstzrange(existing.start_at, existing.end_at, '[)')");
    expect(migration).toContain("tstzrange(NEW.start_at, NEW.end_at, '[)')");
    expect(migration).toContain("BOOKING_TIME_CONFLICT");
    expect(verify).toContain("saraya_meeting_room_bookings_no_overlap");
  });

  it("indexes room availability and property booking timelines", () => {
    for (const index of [
      "saraya_meeting_rooms_property_status_idx",
      "saraya_meeting_room_bookings_room_time_idx",
      "saraya_meeting_room_bookings_property_start_idx",
      "saraya_meeting_room_bookings_user_start_idx",
    ]) {
      expect(migration).toContain(`CREATE INDEX "${index}"`);
      expect(verify).toContain(index);
    }
  });

  it("appends after 0113 without rewriting prior journal entries", () => {
    const previous = journal.entries.find(
      (entry) => entry.tag === "0113_registration_country_provisioning",
    );
    const current = journal.entries.find(
      (entry) => entry.tag === "0114_saraya_meeting_room_bookings",
    );

    expect(current).toEqual(
      expect.objectContaining({ tag: "0114_saraya_meeting_room_bookings" }),
    );
    expect(current!.idx).toBe(previous!.idx + 1);
  });
});
