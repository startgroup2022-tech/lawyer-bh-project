type CompleteProfileRow = {
  id: string;
  subscriptionType?: string | null;
  subscriptionTypes?: string[] | null;
  fullNameAr?: string | null;
  fullNameEn?: string | null;
  email?: string | null;
  phone?: string | null;
  registrationNo?: string | null;
  registrationLevel?: string | null;
  experienceYears?: number | null;
  language?: string | null;
  workingHours?: string | null;
  specialtyMain?: string | null;
  specialtySubs?: string[] | null;
  specialties?: { main?: string; subs?: string[] } | null;
  licenseExpiryDate?: string | null;
  ibanNumber?: string | null;
  crNumber?: string | null;
  signatureDataUrl?: string | null;
  agreementAccepted?: boolean | null;
};

export function buildCompleteProfileData(row: CompleteProfileRow) {
  const specialtyMain = row.specialtyMain || row.specialties?.main || "";
  const specialtySubs =
    Array.isArray(row.specialtySubs) && row.specialtySubs.length > 0
      ? row.specialtySubs
      : Array.isArray(row.specialties?.subs)
        ? row.specialties.subs
        : [];

  const fullNameAr = row.fullNameAr ?? "";
  const storedFullNameEn = row.fullNameEn ?? "";
  const fullNameEn =
    storedFullNameEn === fullNameAr && /[\u0600-\u06ff]/.test(storedFullNameEn)
      ? ""
      : storedFullNameEn;

  return {
    id: row.id,
    subscriptionType: row.subscriptionType ?? "lawyer",
    subscriptionTypes:
      Array.isArray(row.subscriptionTypes) && row.subscriptionTypes.length > 0
        ? row.subscriptionTypes
        : [row.subscriptionType ?? "lawyer"],
    fullNameAr,
    fullNameEn,
    email: row.email ?? "",
    phone: row.phone ?? "",
    registrationNo:
      row.registrationNo?.startsWith("INV-") ? "" : (row.registrationNo ?? ""),
    registrationLevel: row.registrationLevel ?? "",
    experienceYears: row.experienceYears ?? 0,
    language: row.language ?? "",
    workingHours: row.workingHours ?? "",
    specialtyMain,
    specialtySubs,
    licenseExpiryDate: row.licenseExpiryDate ?? "",
    ibanNumber: row.ibanNumber ?? "",
    crNumber: row.crNumber ?? "",
    signatureDataUrl: row.signatureDataUrl ?? "",
    agreementAccepted: Boolean(row.agreementAccepted),
  };
}

export function existingFileState(input: {
  fileName?: string | null;
  mimeType?: string | null;
  url?: string | null;
  base64?: string | null;
  previewRoute: string;
}) {
  const exists = Boolean(input.fileName || input.url || input.base64);
  return {
    fileName: input.fileName ?? "",
    mimeType: input.mimeType ?? "",
    exists,
    preview: input.url || (input.base64 ? input.previewRoute : ""),
  };
}
