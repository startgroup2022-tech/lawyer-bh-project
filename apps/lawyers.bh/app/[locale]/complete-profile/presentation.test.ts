import { describe, expect, it } from "vitest";
import {
  completeProfileInvalidProps,
  completeProfileSteps,
  requiredFieldLabel,
  signatureCanvasProps,
} from "./presentation";

describe("complete profile registration presentation", () => {
  it("keeps every registration field visible across four steps", () => {
    expect(completeProfileSteps).toHaveLength(4);
    expect(completeProfileSteps.flatMap((step) => step.fields)).toEqual([
      "subscriptionType",
      "experienceYears",
      "registrationLevel",
      "specialtyMain",
      "specialtySub1",
      "specialtySub2",
      "profileImage",
      "fullNameAr",
      "fullNameEn",
      "email",
      "phone",
      "password",
      "confirmPassword",
      "language",
      "licenseNumber",
      "licenseExpiryDate",
      "crNumber",
      "institutionLicenseFile",
      "ibanNumber",
      "ibanCertificateFile",
      "workingHours",
      "licenseFile",
      "personalIdFile",
      "agreementAccepted",
      "signatureDataUrl",
    ]);
  });

  it("links an invalid field to its inline error for assistive technology", () => {
    expect(completeProfileInvalidProps("email", { email: "Invalid email" })).toEqual({
      "aria-invalid": true,
      "aria-describedby": "email-error",
    });
    expect(completeProfileInvalidProps("phone", {})).toEqual({});
  });

  it("marks required labels but leaves optional labels unmarked", () => {
    expect(requiredFieldLabel("Email", true)).toEqual({ text: "Email", required: true });
    expect(requiredFieldLabel("CR Number", false)).toEqual({ text: "CR Number", required: false });
  });
});

describe("complete profile signature canvas", () => {
  it("accepts pointer drawing on a visible fixed-height canvas", () => {
    expect(signatureCanvasProps.className).toContain("touch-none");
    expect(signatureCanvasProps.style).toMatchObject({
      width: "100%",
      height: "160px",
      display: "block",
      touchAction: "none",
    });
  });
});
