import { describe, expect, it } from "vitest";
import { joinUploadFeedback } from "./join-upload-feedback";

describe("registration upload feedback", () => {
  it.each([
    ["licenseFile", "ملف رخصة المحاماة"],
    ["institutionLicenseFile", "ملف رخصة المؤسسة"],
    ["ibanCertificateFile", "ملف شهادة الآيبان"],
    ["personalIdFile", "ملف البطاقة الشخصية"],
  ])("identifies the rejected %s PDF in Arabic", (field, label) => {
    expect(joinUploadFeedback({ error: "invalid_document", field }, "ar"))
      .toEqual({
        field,
        message: `${label} غير صالح. ارفع PDF صحيحًا غير محمي أو صورة مقبولة.`,
      });
  });

  it("identifies the rejected document in English", () => {
    expect(joinUploadFeedback({
      error: "invalid_document",
      field: "ibanCertificateFile",
    }, "en")).toEqual({
      field: "ibanCertificateFile",
      message: "IBAN certificate is invalid. Upload a valid, unencrypted PDF or an accepted image.",
    });
  });

  it("does not turn an unrecognized server field into visible text", () => {
    expect(joinUploadFeedback({ error: "invalid_document", field: "password" }, "ar"))
      .toBeNull();
    expect(joinUploadFeedback({ error: "other", field: "licenseFile" }, "ar"))
      .toBeNull();
  });
});
