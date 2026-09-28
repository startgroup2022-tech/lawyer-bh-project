import { describe, expect, it } from "vitest";
import {
  getFirstCompleteProfileError,
  validateAllCompleteProfileSteps,
  validateCompleteProfileStep,
  type CompleteProfileValidationInput,
} from "./complete-profile-step-validation";

function validInput(): CompleteProfileValidationInput {
  return {
    subscriptionTypes: ["lawyer"],
    registrationLevel: "practicing_lawyer",
    experienceYears: "5",
    mainSpecialty: "civil",
    subSpecialties: ["commercial", "labor"],
    profileImage: { name: "stored-profile.jpg", size: 1, type: "image/jpeg" },
    fullNameAr: "محامي مراجعة",
    fullNameEn: "Review Lawyer",
    email: "review@example.com",
    phone: "+97336000000",
    password: "StrongPass1",
    confirmPassword: "StrongPass1",
    language: "Both",
    licenseNumber: "LIC-1",
    licenseExpiryDate: "2099-12-31",
    ibanNumber: "BH67BMAG00001299123456",
    ibanCertificateFile: { name: "stored-iban.pdf", size: 1, type: "application/pdf" },
    workingHours: "09:00-17:00",
    licenseFile: { name: "stored-license.pdf", size: 1, type: "application/pdf" },
    personalIdFile: { name: "stored-id.pdf", size: 1, type: "application/pdf" },
    institutionLicenseFile: null,
    agreed: true,
    signatureDataUrl: "data:image/png;base64,AAAA",
  };
}

describe("complete profile step validation", () => {
  it("blocks step one and returns Arabic inline errors for required choices", () => {
    const input = validInput();
    input.subscriptionTypes = [];
    input.experienceYears = "";
    input.mainSpecialty = "";
    input.subSpecialties = [];

    expect(validateCompleteProfileStep(input, 1, "ar")).toEqual({
      subscriptionType: "يرجى اختيار نوع اشتراك واحد على الأقل",
      experienceYears: "يرجى إدخال سنوات الخبرة",
      specialties: "يرجى اختيار التخصص الرئيسي",
    });
  });

  it("accepts stored required documents without forcing a re-upload", () => {
    const input = validInput();

    expect(validateCompleteProfileStep(input, 2, "en")).toEqual({});
    expect(validateCompleteProfileStep(input, 3, "en")).toEqual({});
  });

  it("keeps CR number and institution license optional", () => {
    const input = validInput();
    input.institutionLicenseFile = null;

    expect(validateCompleteProfileStep(input, 3, "en")).toEqual({});
  });

  it("returns English field errors for mismatched passwords and missing files", () => {
    const input = validInput();
    input.confirmPassword = "Different1";
    input.personalIdFile = null;

    expect(validateAllCompleteProfileSteps(input, "en")).toMatchObject({
      confirmPassword: "Passwords do not match",
      personalIdFile: "Please upload personal ID card",
    });
  });

  it("locates the first invalid field and its wizard step", () => {
    expect(
      getFirstCompleteProfileError({
        email: "Invalid email address",
        licenseFile: "Please upload practice license",
      }),
    ).toEqual({ field: "email", step: 2 });
  });
});
