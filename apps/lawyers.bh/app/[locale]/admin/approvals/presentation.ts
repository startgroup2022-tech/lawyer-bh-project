import type { ApplicationItem } from "./Content";

type SpecialtyObject = { main?: string; subs?: string[] };
type NullablePartial<T> = { [K in keyof T]?: T[K] | null };
type ApprovalRow = NullablePartial<Omit<ApplicationItem,
  | "id"
  | "licenseNumber"
  | "createdAt"
  | "updatedAt"
  | "reviewedAt"
  | "suspendedAt"
  | "invitedAt"
  | "completedProfileAt"
  | "signatureImageAvailable"
  | "tapOnboarding"
>> & {
  id: string;
  subscriptionType: ApplicationItem["subscriptionType"];
  status: ApplicationItem["status"];
  registrationNo?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  reviewedAt?: Date | string | null;
  suspendedAt?: Date | string | null;
  invitedAt?: Date | string | null;
  completedProfileAt?: Date | string | null;
  signatureImageUrl?: string | null;
  signatureDataUrl?: string | null;
  tapStage?: NonNullable<ApplicationItem["tapOnboarding"]>["stage"] | null;
  tapKycStatus?: string | null;
  tapPayoutEnabled?: boolean | null;
  tapLastAttemptAt?: Date | string | null;
};

function iso(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateOnly(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function specialty(value: unknown): SpecialtyObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as SpecialtyObject;
  return { main: typeof data.main === "string" ? data.main : "", subs: strings(data.subs) };
}

export function buildApplicationItem(
  row: ApprovalRow,
  reviewedByName: string | null,
  locale: string,
): ApplicationItem {
  const legacySpecialty = specialty(row.specialties);
  const currentSpecialtySubs = strings(row.specialtySubs);

  return {
    id: row.id,
    countryCode: row.countryCode ?? "BH",
    subscriptionType: row.subscriptionType,
    fullNameAr: row.fullNameAr ?? "",
    fullNameEn: row.fullNameEn ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    language: row.language ?? "",
    locale: row.locale ?? null,
    licenseNumber: row.registrationNo ?? "",
    ibanNumber: row.ibanNumber ?? null,
    ibanCertificateFileName: row.ibanCertificateFileName ?? null,
    crNumber: row.crNumber ?? null,
    institutionLicenseFileName: row.institutionLicenseFileName ?? null,
    personalIdFileName: row.personalIdFileName ?? null,
    licenseExpiryDate: dateOnly(row.licenseExpiryDate),
    registrationLevel: row.registrationLevel ?? null,
    experienceYears: row.experienceYears ?? 0,
    workingHours: row.workingHours ?? null,
    specialtyMain: row.specialtyMain || legacySpecialty?.main || null,
    specialtySubs: currentSpecialtySubs.length > 0 ? currentSpecialtySubs : legacySpecialty?.subs ?? [],
    specialties: legacySpecialty,
    notaryId: row.notaryId ?? null,
    membershipNo: row.membershipNo ?? null,
    agreementAccepted: row.agreementAccepted ?? false,
    profileCompleted: row.profileCompleted ?? false,
    invitedAt: iso(row.invitedAt),
    completedProfileAt: iso(row.completedProfileAt),
    isEmergencyReady: row.isEmergencyReady ?? false,
    emergencyRadiusKm: row.emergencyRadiusKm ?? 20,
    emergencyRates: row.emergencyRates && typeof row.emergencyRates === "object" ? row.emergencyRates : null,
    locationSharingEnabled: row.locationSharingEnabled ?? false,
    status: row.suspensionType ? "suspended" : row.status,
    isActive: row.isActive ?? false,
    rejectionReason: row.rejectionReason ?? null,
    suspensionType: row.suspensionType ?? null,
    suspensionReason: row.suspensionReason ?? null,
    suspendedAt: iso(row.suspendedAt),
    approvedLawyerId: row.status === "approved" ? row.id : null,
    profileImageFileName: row.profileImageFileName ?? null,
    licenseFileName: row.licenseFileName ?? null,
    signatureImageAvailable: Boolean(row.signatureImageUrl || row.signatureDataUrl),
    reviewedBy: row.reviewedBy ?? null,
    reviewedByName: row.reviewedBy === "admin" ? (locale === "ar" ? "الإدارة" : "Admin") : reviewedByName,
    createdAt: iso(row.createdAt) ?? new Date(0).toISOString(),
    reviewedAt: iso(row.reviewedAt),
    updatedAt: iso(row.updatedAt),
    tapOnboarding: row.tapStage ? {
      stage: row.tapStage,
      kycStatus: row.tapKycStatus ?? "pending",
      payoutEnabled: row.tapPayoutEnabled ?? false,
      lastAttemptAt: iso(row.tapLastAttemptAt),
    } : null,
  };
}
