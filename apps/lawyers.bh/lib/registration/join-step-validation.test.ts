import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  getFirstJoinError,
  getJoinStepForField,
  validateAllJoinSteps,
  validateJoinStep,
  type JoinValidationInput,
} from "./join-step-validation";

const image = {
  name: "profile.jpg",
  size: 1024,
  type: "image/jpeg",
};
const document = {
  name: "document.pdf",
  size: 1024,
  type: "application/pdf",
};

function emptyInput(): JoinValidationInput {
  return {
    subscriptionTypes: [],
    registrationLevel: "",
    experienceYears: "",
    mainSpecialty: "",
    subSpecialties: [],
    profileImage: null,
    fullNameAr: "",
    fullNameEn: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    language: "",
    licenseNumber: "",
    licenseExpiryDate: "",
    ibanNumber: "",
    ibanCertificateFile: null,
    workingHours: "",
    licenseFile: null,
    personalIdFile: null,
    institutionLicenseFile: null,
    agreed: false,
    signatureDataUrl: "",
  };
}

function validInput(): JoinValidationInput {
  return {
    ...emptyInput(),
    subscriptionTypes: ["Lawyer"],
    registrationLevel: "practicing_lawyer",
    experienceYears: "5",
    mainSpecialty: "civil",
    subSpecialties: ["commercial", "labor"],
    profileImage: image,
    fullNameAr: "محام تجريبي",
    fullNameEn: "Test Lawyer",
    email: "lawyer@example.com",
    phone: "+97336000000",
    password: "Password1",
    confirmPassword: "Password1",
    language: "Both",
    licenseNumber: "123456",
    licenseExpiryDate: "2099-12-31",
    ibanNumber: "BH67BMAG00001299123456",
    ibanCertificateFile: document,
    workingHours: "09:00-17:00",
    licenseFile: document,
    personalIdFile: document,
    agreed: true,
    signatureDataUrl: "data:image/png;base64,signature",
  };
}

describe("join step validation", () => {
  it("uses the combined identifier wording", () => {
    expect(validateJoinStep(emptyInput(), 3, "ar").licenseNumber).toBe(
      "يرجى إدخال رقم الرخصة أو الرقم الشخصي",
    );
    expect(validateJoinStep(emptyInput(), 3, "en").licenseNumber).toBe(
      "Please enter the license number or personal number",
    );
  });

  it.each([
    [1, ["subscriptionType", "experienceYears", "specialties"]],
    [
      2,
      [
        "profileImage",
        "fullNameAr",
        "fullNameEn",
        "email",
        "phone",
        "password",
        "confirmPassword",
        "language",
      ],
    ],
    [
      3,
      [
        "licenseNumber",
        "licenseExpiryDate",
        "ibanNumber",
        "ibanCertificateFile",
        "workingHours",
        "licenseFile",
        "personalIdFile",
      ],
    ],
    [4, ["agreed", "signatureDataUrl"]],
  ] as const)("rejects missing required fields on step %s", (step, fields) => {
    expect(Object.keys(validateJoinStep(emptyInput(), step, "en"))).toEqual(
      fields,
    );
  });

  it.each([1, 2, 3, 4] as const)("accepts a valid step %s", (step) => {
    expect(validateJoinStep(validInput(), step, "en")).toEqual({});
  });

  it("requires registration level only when Lawyer is selected", () => {
    const lawyer = { ...validInput(), registrationLevel: "" };
    const consultant = {
      ...lawyer,
      subscriptionTypes: ["Consultant"],
    };

    expect(validateJoinStep(lawyer, 1, "en").registrationLevel).toBe(
      "Please select registration level",
    );
    expect(validateJoinStep(consultant, 1, "en").registrationLevel).toBeUndefined();
  });

  it("requires exactly two distinct sub-specialties", () => {
    for (const subSpecialties of [
      ["commercial"],
      ["commercial", "commercial"],
      ["commercial", "labor", "criminal"],
    ]) {
      expect(
        validateJoinStep({ ...validInput(), subSpecialties }, 1, "en")
          .specialties,
      ).toBe("Please select 2 sub-specialties");
    }
  });

  it.each([
    ["experienceYears", { experienceYears: "81" }],
    ["email", { email: "not-an-email" }],
    ["password", { password: "weak", confirmPassword: "weak" }],
    ["confirmPassword", { confirmPassword: "Different1" }],
    ["licenseExpiryDate", { licenseExpiryDate: "2000-01-01" }],
    ["ibanNumber", { ibanNumber: "BH123" }],
    ["workingHours", { workingHours: "overnight" }],
  ] as const)("rejects invalid %s", (field, override) => {
    const errors = validateAllJoinSteps(
      { ...validInput(), ...override },
      "en",
    );
    expect(errors[field]).toBeTruthy();
  });

  it("keeps institution license optional but validates it when supplied", () => {
    expect(
      validateJoinStep(
        { ...validInput(), institutionLicenseFile: null },
        3,
        "en",
      ).institutionLicenseFile,
    ).toBeUndefined();

    expect(
      validateJoinStep(
        {
          ...validInput(),
          institutionLicenseFile: {
            ...document,
            size: 5 * 1024 * 1024 + 1,
          },
        },
        3,
        "en",
      ).institutionLicenseFile,
    ).toBe("Institution license file must be 5MB or less");
  });

  it.each([
    ["profileImage", { name: "profile.svg", size: 100, type: "image/svg+xml" }],
    ["licenseFile", { name: "license.txt", size: 100, type: "text/plain" }],
    ["personalIdFile", { name: "id.gif", size: 100, type: "image/gif" }],
    ["ibanCertificateFile", { name: "iban.webp", size: 100, type: "image/webp" }],
  ] as const)("rejects an unsupported %s type", (field, file) => {
    const errors = validateAllJoinSteps(
      { ...validInput(), [field]: file },
      "en",
    );
    expect(errors[field]).toMatch(/type/i);
  });

  it.each([
    "licenseFile",
    "personalIdFile",
    "ibanCertificateFile",
  ] as const)("rejects an oversized %s", (field) => {
    const errors = validateAllJoinSteps(
      {
        ...validInput(),
        [field]: { ...document, size: 5 * 1024 * 1024 + 1 },
      },
      "en",
    );
    expect(errors[field]).toMatch(/5MB/);
  });

  it("limits profile images to 3MB while documents retain the 5MB limit", () => {
    const overThreeMb = 3 * 1024 * 1024 + 1;

    expect(
      validateJoinStep(
        {
          ...validInput(),
          profileImage: { ...image, size: overThreeMb },
          licenseFile: { ...document, size: overThreeMb },
        },
        2,
        "en",
      ).profileImage,
    ).toBe("Profile image must be 3MB or less");
    expect(
      validateJoinStep(
        { ...validInput(), licenseFile: { ...document, size: overThreeMb } },
        3,
        "en",
      ).licenseFile,
    ).toBeUndefined();
  });

  it.each([
    { name: "portrait.HEIC", size: 1024, type: "" },
    {
      name: "portrait.JPG",
      size: 1024,
      type: "application/octet-stream",
    },
  ])("accepts a supported image extension with a generic MIME type", (file) => {
    expect(
      validateJoinStep({ ...validInput(), profileImage: file }, 2, "en")
        .profileImage,
    ).toBeUndefined();
  });

  it("uses the shared 3MB profile image limit in the join API", () => {
    const routeSource = readFileSync(
      resolve(process.cwd(), "app/api/join/route.ts"),
      "utf8",
    );

    expect(routeSource).toContain("JOIN_PROFILE_IMAGE_MAX_SIZE");
    expect(routeSource).toContain(
      "profileImageFile.size > JOIN_PROFILE_IMAGE_MAX_SIZE",
    );
  });

  it("maps errors to their owning step and returns the first one", () => {
    expect(getJoinStepForField("registrationLevel")).toBe(1);
    expect(getJoinStepForField("profileImage")).toBe(2);
    expect(getJoinStepForField("institutionLicenseFile")).toBe(3);
    expect(getJoinStepForField("signatureDataUrl")).toBe(4);
    expect(
      getFirstJoinError({ email: "bad email", licenseNumber: "missing" }),
    ).toEqual({ field: "email", step: 2 });
    expect(getFirstJoinError({})).toBeNull();
  });
});
