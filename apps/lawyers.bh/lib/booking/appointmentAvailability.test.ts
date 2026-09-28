import { describe, expect, it } from "vitest";
import { listAppointmentAvailability } from "./appointmentAvailability";

describe("Bahrain appointment availability", () => {
  it("returns the next three working days and current booking periods", () => {
    const result = listAppointmentAvailability("en", new Date("2026-09-10T09:00:00+03:00"));
    expect(result.dates.map((date) => date.value)).toEqual(["2026-09-13", "2026-09-14", "2026-09-15"]);
    expect(result.periods.map((period) => period.value)).toEqual(["09:00-13:00", "13:00-17:00", "09:00-17:00"]);
  });
});
