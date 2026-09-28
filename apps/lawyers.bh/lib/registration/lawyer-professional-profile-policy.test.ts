import { describe, expect, it } from "vitest";
import {
  resolveLawyerProfessionalProfile,
  type LawyerRegistrationMode,
} from "./lawyer-professional-profile-policy";

describe("lawyer professional profile policy", () => {
  it("keeps directory-only fields empty for emergency mobile lawyers", () => {
    const mode: LawyerRegistrationMode = "emergency-mobile";

    expect(
      resolveLawyerProfessionalProfile({
        mode,
        requiresRegistrationLevel: true,
        registrationLevel: "",
        workingHours: "",
        specialtyMain: "",
        specialtySubs: [],
      }),
    ).toEqual({
      ok: true,
      profile: {
        registrationLevel: null,
        workingHours: null,
        specialtyMain: null,
        specialtySubs: [],
        specialties: { main: null, subs: [] },
      },
    });
  });

  it("keeps web lawyer registration strict when professional fields are missing", () => {
    expect(
      resolveLawyerProfessionalProfile({
        mode: "web",
        requiresRegistrationLevel: true,
        registrationLevel: "",
        workingHours: "",
        specialtyMain: "",
        specialtySubs: [],
      }),
    ).toEqual({ ok: false, error: "Missing required fields" });
  });

  it("accepts a complete web directory profile", () => {
    expect(
      resolveLawyerProfessionalProfile({
        mode: "web",
        requiresRegistrationLevel: true,
        registrationLevel: "practicing_lawyer",
        workingHours: "09:00-17:00",
        specialtyMain: "civil",
        specialtySubs: ["commercial", "labor"],
      }),
    ).toEqual({
      ok: true,
      profile: {
        registrationLevel: "practicing_lawyer",
        workingHours: "09:00-17:00",
        specialtyMain: "civil",
        specialtySubs: ["commercial", "labor"],
        specialties: {
          main: "civil",
          subs: ["commercial", "labor"],
        },
      },
    });
  });
});
