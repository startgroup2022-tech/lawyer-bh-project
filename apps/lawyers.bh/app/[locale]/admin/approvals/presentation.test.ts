import { describe, expect, it } from "vitest";
import { buildApplicationItem } from "./presentation";

describe("approval application presentation", () => {
  it("presents a legacy expired-license account as suspended", () => {
    const item = buildApplicationItem(
      {
        id: "expired-lawyer",
        countryCode: "BH",
        subscriptionType: "lawyer",
        status: "approved",
        suspensionType: "license_expired",
        registrationNo: "REG-EXPIRED",
      },
      null,
      "ar",
    );

    expect(item.status).toBe("suspended");
    expect(item.suspensionType).toBe("license_expired");
  });

  it("keeps administrator-relevant lawyer data without leaking sensitive storage or tracking values", () => {
    const item = buildApplicationItem(
      {
        id: "lawyer-1",
        countryCode: "BH",
        subscriptionType: "lawyer",
        fullNameAr: "محامٍ تجريبي",
        fullNameEn: "Test Lawyer",
        email: "lawyer@example.com",
        phone: "+97330000000",
        language: "Arabic",
        locale: "ar",
        registrationNo: "REG-100",
        registrationLevel: "practicing_lawyer",
        ibanNumber: "BH00TEST00000000000000",
        ibanCertificateFileName: "iban.pdf",
        crNumber: "CR-200",
        institutionLicenseFileName: "cr.pdf",
        personalIdFileName: "id.pdf",
        licenseExpiryDate: "2027-08-19",
        experienceYears: 12,
        workingHours: "08:00-16:00",
        specialties: { main: "commercial", subs: ["civil"] },
        specialtyMain: null,
        specialtySubs: [],
        notaryId: null,
        membershipNo: "MEM-3",
        agreementAccepted: true,
        profileCompleted: true,
        invitedAt: new Date("2026-08-01T10:00:00.000Z"),
        completedProfileAt: new Date("2026-08-02T10:00:00.000Z"),
        isEmergencyReady: true,
        emergencyRadiusKm: 25,
        emergencyRates: { emergency_arrest: 75 },
        locationSharingEnabled: false,
        signatureImageUrl: "https://storage.example/SIGNATURE_SECRET",
        signatureDataUrl: "data:image/png;base64,SIGNATURE_DATA_SECRET",
        status: "pending",
        isActive: false,
        rejectionReason: null,
        suspensionType: null,
        suspensionReason: null,
        suspendedAt: null,
        reviewedAt: null,
        reviewedBy: null,
        createdAt: new Date("2026-08-01T09:00:00.000Z"),
        updatedAt: new Date("2026-08-02T11:00:00.000Z"),
        profileImageFileName: "profile.jpg",
        licenseFileName: "license.pdf",
        tapStage: "pending_admin",
        tapKycStatus: "pending",
        tapPayoutEnabled: false,
        tapLastAttemptAt: null,
      },
      null,
      "ar",
    );

    expect(item).toMatchObject({
      countryCode: "BH",
      workingHours: "08:00-16:00",
      membershipNo: "MEM-3",
      personalIdFileName: "id.pdf",
      signatureImageAvailable: true,
      profileCompleted: true,
      isEmergencyReady: true,
      emergencyRadiusKm: 25,
      emergencyRates: { emergency_arrest: 75 },
      specialtyMain: "commercial",
      specialtySubs: ["civil"],
    });
    expect(JSON.stringify(item)).not.toContain("SIGNATURE_SECRET");
    expect(JSON.stringify(item)).not.toContain("SIGNATURE_DATA_SECRET");
  });
});
