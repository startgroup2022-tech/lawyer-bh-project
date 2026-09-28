import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
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
        id: schema.saudiLawyers.id,
        subscriptionType: schema.saudiLawyers.subscriptionType,
        fullNameAr: schema.saudiLawyers.fullNameAr,
        fullNameEn: schema.saudiLawyers.fullNameEn,
        email: schema.saudiLawyers.email,
        phone: schema.saudiLawyers.phone,
        language: schema.saudiLawyers.language,
        registrationNo: schema.saudiLawyers.registrationNo,
        licenseExpiryDate: schema.saudiLawyers.licenseExpiryDate,
        specialtyMain: schema.saudiLawyers.specialtyMain,
        specialtySubs: schema.saudiLawyers.specialtySubs,
        specialties: schema.saudiLawyers.specialties,
        status: schema.saudiLawyers.status,
        isActive: schema.saudiLawyers.isActive,
        profileCompleted: schema.saudiLawyers.profileCompleted,
        profileImageUrl: schema.saudiLawyers.profileImageUrl,
        profileImageBlobPath: schema.saudiLawyers.profileImageBlobPath,
      })
      .from(schema.saudiLawyers)
      .where(
        and(
          eq(schema.saudiLawyers.id, providerId),
          eq(schema.saudiLawyers.countryCode, countryCode),
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
    });

    return NextResponse.json({
      ok: true,
      provider: {
        id: provider.id,
        countryCode,
        subscriptionType: provider.subscriptionType,
        fullNameAr: provider.fullNameAr,
        fullNameEn: provider.fullNameEn,
        email: provider.email ?? "",
        phone: provider.phone,
        language: provider.language,
        registrationNo: provider.registrationNo,
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
        access,
      },
    });
  } catch (err) {
    console.error("[provider/me] failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not load provider" },
      { status: 500 },
    );
  }
}
