import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hook = readFileSync(new URL("./useBookAppointmentState.tsx", import.meta.url), "utf8");

describe("country-specific booking catalogue", () => {
  it("loads countries then requests methods and lawyers for the chosen country", () => {
    expect(hook).toContain("/api/countries?channel=website");
    expect(hook).toContain("consultation-methods?countryCode=${encodeURIComponent(countryCode)}");
    expect(hook).toContain("new URLSearchParams({ service, countryCode })");
    expect(hook).toContain("countryCode,");
  });

  it("keeps the empty catalogue message for the internally selected country", () => {
    expect(hook).toContain("لا توجد أنواع استشارة متاحة لهذه الدولة حاليًا");
  });
});
