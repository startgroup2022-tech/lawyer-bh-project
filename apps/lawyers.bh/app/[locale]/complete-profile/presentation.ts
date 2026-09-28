export const completeProfileSteps = [
  {
    number: 1,
    fields: [
      "subscriptionType",
      "experienceYears",
      "registrationLevel",
      "specialtyMain",
      "specialtySub1",
      "specialtySub2",
    ],
  },
  {
    number: 2,
    fields: [
      "profileImage",
      "fullNameAr",
      "fullNameEn",
      "email",
      "phone",
      "password",
      "confirmPassword",
      "language",
    ],
  },
  {
    number: 3,
    fields: [
      "licenseNumber",
      "licenseExpiryDate",
      "crNumber",
      "institutionLicenseFile",
      "ibanNumber",
      "ibanCertificateFile",
      "workingHours",
      "licenseFile",
      "personalIdFile",
    ],
  },
  {
    number: 4,
    fields: ["agreementAccepted", "signatureDataUrl"],
  },
] as const;

export const signatureCanvasProps = {
  className: "block h-40 w-full rounded-lg bg-white touch-none",
  style: {
    width: "100%",
    height: "160px",
    display: "block",
    touchAction: "none",
  },
} as const;

export function completeProfileInvalidProps(
  field: string,
  errors: Record<string, string>,
) {
  if (!errors[field]) return {};

  return {
    "aria-invalid": true,
    "aria-describedby": `${field}-error`,
  } as const;
}

export function requiredFieldLabel(text: string, required: boolean) {
  return { text, required } as const;
}
