import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("0130 lawyer availability and appointments migration", () => {
  const migration = readFileSync(
    "drizzle/0130_lawyer_availability_appointments.sql",
    "utf8",
  );
  const journal = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8"),
  ) as { entries: Array<{ idx: number; tag: string }> };

  it("creates the availability, blocked-date and appointment tables", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.bahrain_lawyer_availability");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.bahrain_lawyer_blocked_dates");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.bahrain_appointment_slots");
  });

  it("adds a partial unique index so a lawyer cannot be double-booked", () => {
    expect(migration).toContain("appointment_slots_lawyer_date_start_active_uidx");
    expect(migration).toContain("WHERE status IN ('booked', 'confirmed')");
    expect(migration).toContain("appointment_slots_booking_unique_idx");
  });

  it("numbers weekdays Sunday-first to match the app", () => {
    expect(migration).toContain("CHECK (weekday BETWEEN 0 AND 6)");
  });

  it("adds the profile columns the mobile editor writes", () => {
    for (const column of [
      "bio",
      "city",
      "professional_title",
      "office_location",
      "languages",
      "consultation_fee",
      "accepts_online",
      "accepts_inperson",
      "profile_status",
    ]) {
      expect(migration).toContain(`ADD COLUMN IF NOT EXISTS ${column}`);
    }
  });

  it("is registered in the journal by tag", () => {
    expect(
      journal.entries.find((entry) => entry.tag === "0130_lawyer_availability_appointments"),
    ).toEqual(expect.objectContaining({ idx: 121 }));
  });
});
