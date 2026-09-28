import { describe, expect, it } from "vitest";
import { validateProfileChangeSubmission } from "./profile-change-validation";

const file = (name: string, type: string, size = 10) =>
  ({ name, type, size } as File);

describe("profile change validation", () => {
  it("rejects a malformed Bahrain IBAN", () => {
    expect(
      validateProfileChangeSubmission({
        approvedIban: "BH67BMAG00001299123456",
        ibanNumber: "BH123",
        ibanCertificate: file("iban.pdf", "application/pdf"),
      }),
    ).toEqual({ ibanNumber: "IBAN_INVALID" });
  });

  it("requires a certificate when IBAN changes", () => {
    expect(
      validateProfileChangeSubmission({
        approvedIban: "BH67BMAG00001299123456",
        ibanNumber: "BH02BBKU00000076000101",
      }),
    ).toEqual({ ibanCertificate: "IBAN_CERTIFICATE_REQUIRED" });
  });

  it("requires a license file when license data changes", () => {
    expect(
      validateProfileChangeSubmission({
        approvedLicenseExpiryDate: "2030-01-01",
        licenseExpiryDate: "2031-01-01",
        today: "2026-09-05",
      }),
    ).toEqual({ licenseFile: "LICENSE_FILE_REQUIRED" });
  });

  it("rejects an expired proposed license date", () => {
    expect(
      validateProfileChangeSubmission({
        approvedLicenseExpiryDate: "2030-01-01",
        licenseExpiryDate: "2026-09-05",
        licenseFile: file("license.pdf", "application/pdf"),
        today: "2026-09-05",
      }),
    ).toEqual({ licenseExpiryDate: "LICENSE_EXPIRY_INVALID" });
  });

  it("rejects unsupported and oversized files", () => {
    expect(
      validateProfileChangeSubmission({
        profileImage: file("avatar.svg", "image/svg+xml"),
        personalId: file("id.pdf", "application/pdf", 5 * 1024 * 1024 + 1),
      }),
    ).toEqual({
      personalId: "FILE_TOO_LARGE",
      profileImage: "FILE_TYPE_INVALID",
    });
  });
});
