import { describe, expect, it } from "vitest";

import {
  isLicenseRenewalErrorCode,
  licenseRenewalErrorMessage,
  validateLicenseRenewalInput,
} from "./license-renewal-validation";

const validFile = {
  name: "renewed-license.pdf",
  type: "application/pdf",
  size: 1024,
};

describe("validateLicenseRenewalInput", () => {
  it("requires both the new expiry date and the renewed license file", () => {
    expect(
      validateLicenseRenewalInput({
        licenseExpiryDate: "",
        file: null,
        today: "2026-09-05",
      }),
    ).toEqual({
      licenseExpiryDate: "LICENSE_EXPIRY_REQUIRED",
      licenseFile: "LICENSE_FILE_REQUIRED",
    });
  });

  it.each(["invalid", "2026-09-05", "2026-09-04"])(
    "rejects non-future expiry %s",
    (licenseExpiryDate) => {
      expect(
        validateLicenseRenewalInput({
          licenseExpiryDate,
          file: validFile,
          today: "2026-09-05",
        }),
      ).toEqual({ licenseExpiryDate: "LICENSE_EXPIRY_INVALID" });
    },
  );

  it("rejects unsupported file formats", () => {
    expect(
      validateLicenseRenewalInput({
        licenseExpiryDate: "2026-09-06",
        file: { name: "license.docx", type: "", size: 1024 },
        today: "2026-09-05",
      }),
    ).toEqual({ licenseFile: "LICENSE_FILE_TYPE_INVALID" });
  });

  it("rejects a file larger than 5 MB", () => {
    expect(
      validateLicenseRenewalInput({
        licenseExpiryDate: "2026-09-06",
        file: { ...validFile, size: 5 * 1024 * 1024 + 1 },
        today: "2026-09-05",
      }),
    ).toEqual({ licenseFile: "LICENSE_FILE_TOO_LARGE" });
  });

  it("accepts PDF, JPEG, and PNG files with a future expiry", () => {
    for (const file of [
      validFile,
      { name: "license.jpg", type: "image/jpeg", size: 2048 },
      { name: "license.png", type: "image/png", size: 4096 },
    ]) {
      expect(
        validateLicenseRenewalInput({
          licenseExpiryDate: "2027-01-01",
          file,
          today: "2026-09-05",
        }),
      ).toEqual({});
    }
  });
});

describe("licenseRenewalErrorMessage", () => {
  it("recognizes only supported server error codes", () => {
    expect(isLicenseRenewalErrorCode("LICENSE_FILE_REQUIRED")).toBe(true);
    expect(isLicenseRenewalErrorCode("UNKNOWN_ERROR")).toBe(false);
    expect(isLicenseRenewalErrorCode(null)).toBe(false);
  });

  it("returns localized required and file-validation messages", () => {
    expect(licenseRenewalErrorMessage("LICENSE_EXPIRY_REQUIRED", "ar")).toBe(
      "تاريخ انتهاء الرخصة الجديدة مطلوب",
    );
    expect(licenseRenewalErrorMessage("LICENSE_FILE_REQUIRED", "en")).toBe(
      "Renewed license file is required",
    );
    expect(licenseRenewalErrorMessage("LICENSE_FILE_TYPE_INVALID", "ar")).toBe(
      "يجب أن يكون الملف PDF أو JPG أو PNG",
    );
    expect(licenseRenewalErrorMessage("LICENSE_FILE_TOO_LARGE", "en")).toBe(
      "The file must not exceed 5 MB",
    );
  });
});
