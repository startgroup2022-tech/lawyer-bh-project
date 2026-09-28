import { describe, expect, it } from "vitest";
import { DR_NABIH_INSTRUCTIONS } from "./persona";

describe("Dr. Nabih persona", () => {
  it("uses the approved identity and email without embedded prices", () => {
    expect(DR_NABIH_INSTRUCTIONS).toContain("د. نبيه");
    expect(DR_NABIH_INSTRUCTIONS).toContain("info@lawyers.bh");
    expect(DR_NABIH_INSTRUCTIONS).not.toContain("ceo@lawyers.bh");
    expect(DR_NABIH_INSTRUCTIONS).not.toMatch(/\b(?:30|35|40|45)\s*(?:BHD|د\.ب)/i);
  });
});
