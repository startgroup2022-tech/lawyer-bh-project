import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { token?: string } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const token = String(body.token ?? "").trim();

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Token is required" },
      { status: 400 },
    );
  }

  const [lawyer] = await db
    .select({
      id: schema.saudiLawyers.id,
      countryCode: schema.saudiLawyers.countryCode,

      fullNameAr: schema.saudiLawyers.fullNameAr,
      fullNameEn: schema.saudiLawyers.fullNameEn,
      email: schema.saudiLawyers.email,
      phone: schema.saudiLawyers.phone,

      registrationNo: schema.saudiLawyers.registrationNo,
      registrationLevel: schema.saudiLawyers.registrationLevel,
      experienceYears: schema.saudiLawyers.experienceYears,
      language: schema.saudiLawyers.language,
      workingHours: schema.saudiLawyers.workingHours,

      specialtyMain: schema.saudiLawyers.specialtyMain,
      specialtySubs: schema.saudiLawyers.specialtySubs,
      specialties: schema.saudiLawyers.specialties,

      licenseExpiryDate: schema.saudiLawyers.licenseExpiryDate,

      profileImageFileName: schema.saudiLawyers.profileImageFileName,
      profileImageMimeType: schema.saudiLawyers.profileImageMimeType,
      profileImageBase64: schema.saudiLawyers.profileImageBase64,

      licenseFileName: schema.saudiLawyers.licenseFileName,
      licenseFileMimeType: schema.saudiLawyers.licenseFileMimeType,
      licenseFileBase64: schema.saudiLawyers.licenseFileBase64,

      signatureDataUrl: schema.saudiLawyers.signatureDataUrl,
      agreementAccepted: schema.saudiLawyers.agreementAccepted,

      profileCompleted: schema.saudiLawyers.profileCompleted,
      inviteTokenExpiresAt: schema.saudiLawyers.inviteTokenExpiresAt,
    })
    .from(schema.saudiLawyers)
    .where(eq(schema.saudiLawyers.inviteToken, token))
    .limit(1);

  if (!lawyer) {
    return NextResponse.json(
      { ok: false, error: "Invalid invitation link" },
      { status: 404 },
    );
  }

  if (lawyer.profileCompleted) {
    return NextResponse.json(
      { ok: false, error: "Profile already completed" },
      { status: 409 },
    );
  }

  if (
    lawyer.inviteTokenExpiresAt &&
    new Date(lawyer.inviteTokenExpiresAt).getTime() < Date.now()
  ) {
    return NextResponse.json(
      { ok: false, error: "Invitation link expired" },
      { status: 410 },
    );
  }

  const profileImagePreview =
    lawyer.profileImageBase64 && lawyer.profileImageMimeType
      ? `data:${lawyer.profileImageMimeType};base64,${lawyer.profileImageBase64}`
      : "";

  const licenseFilePreview =
    lawyer.licenseFileBase64 && lawyer.licenseFileMimeType
      ? `data:${lawyer.licenseFileMimeType};base64,${lawyer.licenseFileBase64}`
      : "";

  const specialtiesData = lawyer.specialties as
    | {
        main?: string;
        subs?: string[];
      }
    | null
    | undefined;

  const specialtyMain = lawyer.specialtyMain || specialtiesData?.main || "";

  const specialtySubs =
    Array.isArray(lawyer.specialtySubs) && lawyer.specialtySubs.length > 0
      ? lawyer.specialtySubs
      : Array.isArray(specialtiesData?.subs)
        ? specialtiesData.subs
        : [];

  const hasSignature = Boolean(
    lawyer.signatureDataUrl && lawyer.signatureDataUrl.trim(),
  );

  const signedAgreementUrl = hasSignature
    ? `/api/provider/signed-agreement?id=${encodeURIComponent(lawyer.id)}`
    : "";

  return NextResponse.json({
    ok: true,
    lawyer: {
      id: lawyer.id,

      fullNameAr: lawyer.fullNameAr ?? "",
      fullNameEn: lawyer.fullNameEn ?? "",
      email: lawyer.email ?? "",
      phone: lawyer.phone ?? "",

      registrationNo:
        lawyer.registrationNo && lawyer.registrationNo.startsWith("INV-")
          ? ""
          : lawyer.registrationNo ?? "",

      registrationLevel: lawyer.registrationLevel ?? "",
      experienceYears: lawyer.experienceYears ?? 0,
      language: lawyer.language ?? "",
      workingHours: lawyer.workingHours ?? "",

      specialtyMain,
      specialtySubs,

      licenseExpiryDate: lawyer.licenseExpiryDate ?? "",

      profileImageFileName: lawyer.profileImageFileName ?? "",
      profileImageMimeType: lawyer.profileImageMimeType ?? "",
      profileImagePreview,

      licenseFileName: lawyer.licenseFileName ?? "",
      licenseFileMimeType: lawyer.licenseFileMimeType ?? "",
      licenseFilePreview,

      signatureDataUrl: lawyer.signatureDataUrl ?? "",
      hasSignature,
      agreementAccepted: Boolean(lawyer.agreementAccepted),
      signedAgreementUrl,
    },
  });
}