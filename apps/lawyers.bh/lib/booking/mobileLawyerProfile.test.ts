import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {},
  schema: {},
  sqlClient: vi.fn(),
}));

import { parseLawyerProfileUpdate } from "./mobileLawyerProfile";

describe("parseLawyerProfileUpdate", () => {
  it("accepts the snake_case payload the profile editor sends", () => {
    const result = parseLawyerProfileUpdate({
      professional_name: "Ahmed Al Mansoori",
      professional_name_en: "Ahmed Al Mansoori",
      bio: "محامٍ تجاري",
      city: "Manama",
      location: "Isa Town",
      experience_years: 14,
      consultation_fee: 35.5,
      languages: ["ar", "en"],
      accepts_online: true,
      accepts_inperson: false,
      profile_status: "published",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.update).toEqual({
      professionalName: "Ahmed Al Mansoori",
      professionalNameEn: "Ahmed Al Mansoori",
      bio: "محامٍ تجاري",
      city: "Manama",
      location: "Isa Town",
      experienceYears: 14,
      consultationFee: 35.5,
      languages: ["ar", "en"],
      acceptsOnline: true,
      acceptsInperson: false,
      profileStatus: "published",
    });
  });

  it("accepts the hidden status the editor offers", () => {
    const result = parseLawyerProfileUpdate({ profile_status: "hidden" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.update.profileStatus).toBe("hidden");
  });

  it("rejects an unknown status", () => {
    expect(parseLawyerProfileUpdate({ profile_status: "deleted" })).toEqual({
      ok: false,
      error: "invalid_status",
    });
  });

  it("rejects a name shorter than two characters", () => {
    expect(parseLawyerProfileUpdate({ professional_name: "A" })).toEqual({
      ok: false,
      error: "invalid_name",
    });
  });

  it("ignores unknown keys and returns only present fields", () => {
    const result = parseLawyerProfileUpdate({
      bar_number: "123",
      case_fee_min: 10,
      city: "Manama",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.update).toEqual({ city: "Manama" });
  });

  it("rejects non-boolean switches", () => {
    expect(parseLawyerProfileUpdate({ accepts_online: "yes" })).toEqual({
      ok: false,
      error: "invalid_input",
    });
  });

  it("rounds the consultation fee to the column scale", () => {
    const result = parseLawyerProfileUpdate({ consultation_fee: 35.5555 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.update.consultationFee).toBe(35.556);
  });
});
