import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getProviderSessionFromRequest } from "../_session";
import { evaluateProviderAccess } from "../_access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SpecialtiesObject = {
  main?: string;
  subs?: string[];
};

const specialtyMap: Record<string, string> = {
  administrative: "administrative",
  Administrative: "administrative",
  "إدارية": "administrative",
  civil: "civil",
  Civil: "civil",
  "مدنية": "civil",
  commercial: "commercial",
  Commercial: "commercial",
  "تجارية": "commercial",
  labor: "labor",
  Labor: "labor",
  "عمالية": "labor",
  criminal: "criminal",
  Criminal: "criminal",
  "جنائية": "criminal",
  sharia: "sharia",
  Sharia: "sharia",
  "شرعية": "sharia",
  constitutional: "constitutional",
  Constitutional: "constitutional",
  "دستورية": "constitutional",
  cassation: "cassation",
  Cassation: "cassation",
  "تمييز": "cassation",
  sports: "sports",
  Sports: "sports",
  "رياضية": "sports",
};

function normalizeSpecialtyValue(value: unknown) {
  const raw = String(value ?? "").trim();
  return specialtyMap[raw] ?? "";
}

function normalizeSpecialtySubs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.map(normalizeSpecialtyValue).filter(Boolean)),
  ).slice(0, 2);
}

function normalizeSpecialties(value: unknown): SpecialtiesObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const data = value as SpecialtiesObject;

  return {
    main: normalizeSpecialtyValue(data.main),
    subs: normalizeSpecialtySubs(data.subs),
  };
}

export async function GET(request: NextRequest) {
  const session = getProviderSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { providerId, countryCode } = session;

    const [provider] = await db
      .select({
        id: schema.bahrainLawyers.id,
        subscriptionType: schema.bahrainLawyers.subscriptionType,
        subscriptionTypes: schema.bahrainLawyers.subscriptionTypes,
        fullNameAr: schema.bahrainLawyers.fullNameAr,
        fullNameEn: schema.bahrainLawyers.fullNameEn,
        email: schema.bahrainLawyers.email,
        phone: schema.bahrainLawyers.phone,
        language: schema.bahrainLawyers.language,
        registrationNo: schema.bahrainLawyers.registrationNo,
        registrationLevel: schema.bahrainLawyers.registrationLevel,
        ibanNumber: schema.bahrainLawyers.ibanNumber,
        crNumber: schema.bahrainLawyers.crNumber,
        experienceYears: schema.bahrainLawyers.experienceYears,
        workingHours: schema.bahrainLawyers.workingHours,
        licenseExpiryDate: schema.bahrainLawyers.licenseExpiryDate,
        specialtyMain: schema.bahrainLawyers.specialtyMain,
        specialtySubs: schema.bahrainLawyers.specialtySubs,
        specialties: schema.bahrainLawyers.specialties,
        status: schema.bahrainLawyers.status,
        isActive: schema.bahrainLawyers.isActive,
        suspensionType: schema.bahrainLawyers.suspensionType,
        profileCompleted: schema.bahrainLawyers.profileCompleted,
        profileImageUrl: schema.bahrainLawyers.profileImageUrl,
        profileImageBlobPath: schema.bahrainLawyers.profileImageBlobPath,
        profileImageFileName: schema.bahrainLawyers.profileImageFileName,
        licenseFileName: schema.bahrainLawyers.licenseFileName,
        ibanCertificateFileName: schema.bahrainLawyers.ibanCertificateFileName,
        institutionLicenseFileName: schema.bahrainLawyers.institutionLicenseFileName,
        personalIdFileName: schema.bahrainLawyers.personalIdFileName,
      })
      .from(schema.bahrainLawyers)
      .where(
        and(
          eq(schema.bahrainLawyers.id, providerId),
          eq(schema.bahrainLawyers.countryCode, countryCode),
        ),
      )
      .limit(1);

    if (!provider) {
      return NextResponse.json(
        { ok: false, error: "Provider not found" },
        { status: 404 },
      );
    }

    const normalizedSpecialties = normalizeSpecialties(provider.specialties);
    const specialtyMain =
      normalizeSpecialtyValue(provider.specialtyMain) ||
      normalizeSpecialtyValue(normalizedSpecialties?.main) ||
      null;

    const subsFromColumn = normalizeSpecialtySubs(provider.specialtySubs);
    const subsFromObject = normalizeSpecialtySubs(normalizedSpecialties?.subs);
    const specialtySubs =
      subsFromColumn.length > 0 ? subsFromColumn : subsFromObject;

    const profileImageUrl =
      provider.profileImageUrl?.startsWith("http")
        ? provider.profileImageUrl
        : null;

    const access = evaluateProviderAccess({
      profileCompleted: provider.profileCompleted,
      status: provider.status,
      isActive: provider.isActive,
      licenseExpiryDate: provider.licenseExpiryDate,
      suspensionType: provider.suspensionType,
    });

    const [pendingChange] = await db
      .select({
        id: schema.providerProfileChangeRequests.id,
        proposedValues: schema.providerProfileChangeRequests.proposedValues,
        proposedFiles: schema.providerProfileChangeRequests.proposedFiles,
        createdAt: schema.providerProfileChangeRequests.createdAt,
        updatedAt: schema.providerProfileChangeRequests.updatedAt,
      })
      .from(schema.providerProfileChangeRequests)
      .where(
        and(
          eq(schema.providerProfileChangeRequests.providerId, providerId),
          eq(schema.providerProfileChangeRequests.countryCode, countryCode),
          eq(schema.providerProfileChangeRequests.status, "pending"),
        ),
      )
      .limit(1);

    const [lastRejectedChange] = pendingChange
      ? []
      : await db
          .select({
            id: schema.providerProfileChangeRequests.id,
            rejectionReason: schema.providerProfileChangeRequests.rejectionReason,
            reviewedAt: schema.providerProfileChangeRequests.reviewedAt,
          })
          .from(schema.providerProfileChangeRequests)
          .where(
            and(
              eq(schema.providerProfileChangeRequests.providerId, providerId),
              eq(schema.providerProfileChangeRequests.countryCode, countryCode),
              eq(schema.providerProfileChangeRequests.status, "rejected"),
            ),
          )
          .orderBy(desc(schema.providerProfileChangeRequests.reviewedAt))
          .limit(1);

    return NextResponse.json({
      ok: true,
      provider: {
        id: provider.id,
        countryCode,
        subscriptionType: provider.subscriptionType,
        subscriptionTypes: provider.subscriptionTypes,
        fullNameAr: provider.fullNameAr,
        fullNameEn: provider.fullNameEn,
        email: provider.email ?? "",
        phone: provider.phone,
        language: provider.language,
        registrationNo: provider.registrationNo,
        registrationLevel: provider.registrationLevel,
        ibanNumber: provider.ibanNumber ?? "",
        crNumber: provider.crNumber ?? "",
        experienceYears: provider.experienceYears,
        workingHours: provider.workingHours ?? "",
        licenseExpiryDate: provider.licenseExpiryDate,
        specialtyMain,
        specialtySubs,
        specialties: {
          main: specialtyMain ?? "",
          subs: specialtySubs,
        },
        status: provider.status,
        isActive: provider.isActive,
        profileCompleted: provider.profileCompleted,
        profileImageUrl,
        profileImageFileName: provider.profileImageFileName,
        licenseFileName: provider.licenseFileName,
        ibanCertificateFileName: provider.ibanCertificateFileName,
        institutionLicenseFileName: provider.institutionLicenseFileName,
        personalIdFileName: provider.personalIdFileName,
        access,
      },
      pendingProfileChange: pendingChange
        ? {
            id: pendingChange.id,
            status: "pending",
            proposedValues: pendingChange.proposedValues,
            proposedFiles: Object.fromEntries(
              Object.entries(pendingChange.proposedFiles ?? {}).map(([kind, file]) => [
                kind,
                { fileName: file.fileName, mimeType: file.mimeType },
              ]),
            ),
            createdAt: pendingChange.createdAt,
            updatedAt: pendingChange.updatedAt,
          }
        : null,
      lastRejectedProfileChange: lastRejectedChange ?? null,
    });
  } catch (err) {
    console.error("[provider/me] failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not load provider" },
      { status: 500 },
    );
  }
}
