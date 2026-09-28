import { describe, expect, it } from "vitest";
import {
  buildCompleteProfileData,
  existingFileState,
} from "./complete-profile-contract";

describe("complete profile data contract", () => {
  it("does not present the Arabic fallback as an English name", () => {
    const result = buildCompleteProfileData({
      id: "lawyer-legacy-name",
      fullNameAr: "محام تجريبي",
      fullNameEn: "محام تجريبي",
    });

    expect(result.fullNameAr).toBe("محام تجريبي");
    expect(result.fullNameEn).toBe("");
  });

  it("returns every editable stored value", () => {
    const result = buildCompleteProfileData({
      id: "lawyer-1",
      subscriptionType: "lawyer",
      fullNameAr: "محام تجريبي",
      fullNameEn: "Test Lawyer",
      email: "lawyer@example.com",
      phone: "+97333334444",
      registrationNo: "LAW-1",
      registrationLevel: "practicing_lawyer",
      experienceYears: 8,
      language: "Both",
      workingHours: "09:00-17:00",
      specialtyMain: "civil",
      specialtySubs: ["commercial", "labor"],
      specialties: null,
      licenseExpiryDate: "2030-12-31",
      ibanNumber: "BH00TEST123456789012",
      crNumber: "CR-10",
      signatureDataUrl: "data:image/png;base64,abc",
      agreementAccepted: true,
    });

    expect(result).toMatchObject({
      id: "lawyer-1",
      subscriptionType: "lawyer",
      fullNameAr: "محام تجريبي",
      fullNameEn: "Test Lawyer",
      email: "lawyer@example.com",
      phone: "+97333334444",
      registrationNo: "LAW-1",
      registrationLevel: "practicing_lawyer",
      experienceYears: 8,
      language: "Both",
      workingHours: "09:00-17:00",
      specialtyMain: "civil",
      specialtySubs: ["commercial", "labor"],
      licenseExpiryDate: "2030-12-31",
      ibanNumber: "BH00TEST123456789012",
      crNumber: "CR-10",
      agreementAccepted: true,
    });
  });

  it("prefers a blob URL and falls back to the protected preview route", () => {
    expect(
      existingFileState({
        fileName: "license.pdf",
        mimeType: "application/pdf",
        url: "https://blob.example/license.pdf",
        base64: "legacy-data",
        previewRoute: "/api/protected/license",
      }),
    ).toEqual({
      fileName: "license.pdf",
      mimeType: "application/pdf",
      exists: true,
      preview: "https://blob.example/license.pdf",
    });

    expect(
      existingFileState({
        fileName: "legacy.pdf",
        mimeType: "application/pdf",
        url: null,
        base64: "legacy-data",
        previewRoute: "/api/protected/legacy",
      }),
    ).toEqual({
      fileName: "legacy.pdf",
      mimeType: "application/pdf",
      exists: true,
      preview: "/api/protected/legacy",
    });
  });
});
