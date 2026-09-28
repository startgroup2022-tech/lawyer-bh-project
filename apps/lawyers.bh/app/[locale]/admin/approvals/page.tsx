import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getTapConfig } from "@/lib/tap/config";
import Content, { type ApplicationItem } from "./Content";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { redirect } from "next/navigation";
import { buildApplicationItem } from "./presentation";
import { providerApplicationsRepository } from "@/lib/admin/provider-applications-repository";

type Props = {
  params: Promise<{ locale: string }>;
};

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
      id: schema.bahrainLawyers.id,
      countryCode: schema.bahrainLawyers.countryCode,

      subscriptionType: schema.bahrainLawyers.subscriptionType,

      fullNameAr: schema.bahrainLawyers.fullNameAr,
      fullNameEn: schema.bahrainLawyers.fullNameEn,

      email: schema.bahrainLawyers.email,
      phone: schema.bahrainLawyers.phone,

      language: schema.bahrainLawyers.language,
      locale: schema.bahrainLawyers.locale,

      registrationNo: schema.bahrainLawyers.registrationNo,
      registrationLevel: schema.bahrainLawyers.registrationLevel,
      ibanNumber: schema.bahrainLawyers.ibanNumber,
      ibanCertificateFileName: schema.bahrainLawyers.ibanCertificateFileName,
      crNumber: schema.bahrainLawyers.crNumber,
      institutionLicenseFileName: schema.bahrainLawyers.institutionLicenseFileName,
      personalIdFileName: schema.bahrainLawyers.personalIdFileName,
      experienceYears: schema.bahrainLawyers.experienceYears,
      workingHours: schema.bahrainLawyers.workingHours,

      specialties: schema.bahrainLawyers.specialties,
      specialtyMain: schema.bahrainLawyers.specialtyMain,
      specialtySubs: schema.bahrainLawyers.specialtySubs,

      licenseExpiryDate: schema.bahrainLawyers.licenseExpiryDate,
      licenseFileName: schema.bahrainLawyers.licenseFileName,
      licenseFileMimeType: schema.bahrainLawyers.licenseFileMimeType,

      profileImageFileName: schema.bahrainLawyers.profileImageFileName,
      profileImageMimeType: schema.bahrainLawyers.profileImageMimeType,

      signatureDataUrl: schema.bahrainLawyers.signatureDataUrl,
      signatureImageUrl: schema.bahrainLawyers.signatureImageUrl,
      agreementAccepted: schema.bahrainLawyers.agreementAccepted,

      notaryId: schema.bahrainLawyers.notaryId,
      membershipNo: schema.bahrainLawyers.membershipNo,
      profileCompleted: schema.bahrainLawyers.profileCompleted,
      invitedAt: schema.bahrainLawyers.invitedAt,
      completedProfileAt: schema.bahrainLawyers.completedProfileAt,
      isEmergencyReady: schema.bahrainLawyers.isEmergencyReady,
      emergencyRadiusKm: schema.bahrainLawyers.emergencyRadiusKm,
      emergencyRates: schema.bahrainLawyers.emergencyRates,
      locationSharingEnabled: schema.bahrainLawyers.locationSharingEnabled,

      status: schema.bahrainLawyers.status,
      isActive: schema.bahrainLawyers.isActive,

      rejectionReason: schema.bahrainLawyers.rejectionReason,

      reviewedAt: schema.bahrainLawyers.reviewedAt,
      reviewedBy: schema.bahrainLawyers.reviewedBy,

      suspensionType: schema.bahrainLawyers.suspensionType,
      suspensionReason: schema.bahrainLawyers.suspensionReason,
      suspendedAt: schema.bahrainLawyers.suspendedAt,

      createdAt: schema.bahrainLawyers.createdAt,
      updatedAt: schema.bahrainLawyers.updatedAt,

      tapStage: schema.tapRetailerOnboarding.stage,
      tapKycStatus: schema.tapRetailerOnboarding.kycStatus,
      tapPayoutEnabled: schema.tapRetailerOnboarding.payoutEnabled,
      tapLastAttemptAt: schema.tapRetailerOnboarding.lastAttemptAt,
    })
    .from(schema.bahrainLawyers)
    .leftJoin(schema.tapRetailerOnboarding, and(
      eq(schema.tapRetailerOnboarding.lawyerId, schema.bahrainLawyers.id),
      eq(schema.tapRetailerOnboarding.environment, tapConfig.mode),
    ))
    .orderBy(desc(schema.bahrainLawyers.createdAt));

  // The shared repository is the source of truth for multi-country review.
  // Keep the typed Bahrain query above temporarily for Tap compatibility while
  // the repository normalizes both Bahrain and Saudi application rows.
  const countryRows = await providerApplicationsRepository.list();


const reviewedByIds = Array.from(
  new Set(
    countryRows
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

  const applications: ApplicationItem[] = countryRows.map((row) =>
    buildApplicationItem(
      row as Parameters<typeof buildApplicationItem>[0],
      typeof row.reviewedBy === "string" ? adminNameById.get(row.reviewedBy) ?? null : null,
      locale,
    ),
  );

  return <Content applications={applications} />;
}
