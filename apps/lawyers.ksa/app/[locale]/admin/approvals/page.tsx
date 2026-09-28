import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getTapConfig } from "@/lib/tap/config";
import Content, { type ApplicationItem } from "./Content";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

type SpecialtyObject = {
  main?: string;
  subs?: string[];
};

function toIsoDateTime(value: Date | string | null | undefined) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateString(value: Date | string | null | undefined) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

function normalizeSpecialtySubs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

function normalizeSpecialties(value: unknown): SpecialtyObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const data = value as SpecialtyObject;

  return {
    main: typeof data.main === "string" ? data.main : "",
    subs: Array.isArray(data.subs)
      ? data.subs.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";

  return {
    title: isAr ? "موافقات الإدارة" : "Admin Approvals",
  };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!(await requireAdminPermission("manage_approvals"))) redirect(`/${locale}/admin`);
  setRequestLocale(locale);
  const tapConfig = getTapConfig();

  const rows = await db
    .select({
      id: schema.saudiLawyers.id,

      subscriptionType: schema.saudiLawyers.subscriptionType,

      fullNameAr: schema.saudiLawyers.fullNameAr,
      fullNameEn: schema.saudiLawyers.fullNameEn,

      email: schema.saudiLawyers.email,
      phone: schema.saudiLawyers.phone,
      passwordHash: schema.saudiLawyers.passwordHash,

      language: schema.saudiLawyers.language,
      locale: schema.saudiLawyers.locale,

      registrationNo: schema.saudiLawyers.registrationNo,
      registrationLevel: schema.saudiLawyers.registrationLevel,
      experienceYears: schema.saudiLawyers.experienceYears,

      specialties: schema.saudiLawyers.specialties,
      specialtyMain: schema.saudiLawyers.specialtyMain,
      specialtySubs: schema.saudiLawyers.specialtySubs,

      licenseExpiryDate: schema.saudiLawyers.licenseExpiryDate,
      licenseFileName: schema.saudiLawyers.licenseFileName,
      licenseFileMimeType: schema.saudiLawyers.licenseFileMimeType,

      profileImageFileName: schema.saudiLawyers.profileImageFileName,
      profileImageMimeType: schema.saudiLawyers.profileImageMimeType,

      signatureDataUrl: schema.saudiLawyers.signatureDataUrl,
      agreementAccepted: schema.saudiLawyers.agreementAccepted,

      notaryId: schema.saudiLawyers.notaryId,

      status: schema.saudiLawyers.status,
      isActive: schema.saudiLawyers.isActive,

      rejectionReason: schema.saudiLawyers.rejectionReason,

      reviewedAt: schema.saudiLawyers.reviewedAt,
      reviewedBy: schema.saudiLawyers.reviewedBy,

      suspensionType: schema.saudiLawyers.suspensionType,
      suspensionReason: schema.saudiLawyers.suspensionReason,
      suspendedAt: schema.saudiLawyers.suspendedAt,
      suspendedBy: schema.saudiLawyers.suspendedBy,

      ipAddress: schema.saudiLawyers.ipAddress,
      userAgent: schema.saudiLawyers.userAgent,

      createdAt: schema.saudiLawyers.createdAt,
      updatedAt: schema.saudiLawyers.updatedAt,

      tapStage: schema.tapRetailerOnboarding.stage,
      tapRetailerId: schema.tapRetailerOnboarding.retailerId,
      tapLeadId: schema.tapRetailerOnboarding.leadId,
      tapDestinationId: schema.tapRetailerOnboarding.destinationId,
      tapKycStatus: schema.tapRetailerOnboarding.kycStatus,
      tapPayoutEnabled: schema.tapRetailerOnboarding.payoutEnabled,
      tapLastErrorMessage: schema.tapRetailerOnboarding.lastErrorMessage,
      tapLastAttemptAt: schema.tapRetailerOnboarding.lastAttemptAt,
    })
    .from(schema.saudiLawyers)
    .leftJoin(schema.tapRetailerOnboarding, and(
      eq(schema.tapRetailerOnboarding.lawyerId, schema.saudiLawyers.id),
      eq(schema.tapRetailerOnboarding.environment, tapConfig.mode),
    ))
    .orderBy(desc(schema.saudiLawyers.createdAt));


const reviewedByIds = Array.from(
  new Set(
    rows
      .map((row) => row.reviewedBy)
      .filter((value): value is string => {
        if (typeof value !== "string") return false;
        if (!value) return false;
        if (value === "admin") return false;

        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value,
        );
      }),
  ),
);

const admins =
  reviewedByIds.length > 0
    ? await db
        .select({
          id: schema.adminUsers.id,
          fullName: schema.adminUsers.fullName,
          email: schema.adminUsers.email,
        })
        .from(schema.adminUsers)
        .where(inArray(schema.adminUsers.id, reviewedByIds))
    : [];

const adminNameById = new Map(
  admins.map((admin) => [
    admin.id,
    admin.fullName || admin.email,
  ]),
);

  const applications: ApplicationItem[] = rows.map((row) => ({
    id: row.id,

    subscriptionType: row.subscriptionType as ApplicationItem["subscriptionType"],

    fullNameAr: row.fullNameAr ?? "",
    fullNameEn: row.fullNameEn ?? "",

    email: row.email ?? "",
    phone: row.phone ?? "",

    language: row.language ?? "",
    locale: row.locale ?? null,

    // الواجهة تتوقع licenseNumber
    licenseNumber: row.registrationNo ?? "",
    licenseExpiryDate: toDateString(row.licenseExpiryDate),

    registrationLevel: row.registrationLevel ?? null,
    experienceYears: row.experienceYears ?? 0,

    specialtyMain: row.specialtyMain ?? null,
    specialtySubs: normalizeSpecialtySubs(row.specialtySubs),
    specialties: normalizeSpecialties(row.specialties),

    notaryId: row.notaryId ?? null,

    agreementAccepted: row.agreementAccepted ?? false,

    status: row.status as ApplicationItem["status"],
    isActive: row.isActive ?? false,
    rejectionReason: row.rejectionReason ?? null,

    suspensionType: row.suspensionType as ApplicationItem["suspensionType"],
    suspensionReason: row.suspensionReason ?? null,
    suspendedAt: toIsoDateTime(row.suspendedAt),

    approvedLawyerId: row.status === "approved" ? row.id : null,

    profileImageFileName: row.profileImageFileName ?? null,
    licenseFileName: row.licenseFileName ?? null,

    reviewedBy: row.reviewedBy ?? null,
    reviewedByName:
  row.reviewedBy === "admin"
    ? locale === "ar"
      ? "الإدارة"
      : "Admin"
    : row.reviewedBy
      ? adminNameById.get(row.reviewedBy) ?? null
      : null,
    createdAt: toIsoDateTime(row.createdAt) ?? new Date().toISOString(),
    reviewedAt: toIsoDateTime(row.reviewedAt),
    updatedAt: toIsoDateTime(row.updatedAt),
    tapOnboarding: row.tapStage ? {
      stage: row.tapStage,
      retailerId: row.tapRetailerId ?? null,
      leadId: row.tapLeadId ?? null,
      destinationId: row.tapDestinationId ?? null,
      kycStatus: row.tapKycStatus ?? "pending",
      payoutEnabled: row.tapPayoutEnabled ?? false,
      lastErrorMessage: row.tapLastErrorMessage ?? null,
      lastAttemptAt: toIsoDateTime(row.tapLastAttemptAt),
    } : null,
  }));

  return <Content applications={applications} />;
}
