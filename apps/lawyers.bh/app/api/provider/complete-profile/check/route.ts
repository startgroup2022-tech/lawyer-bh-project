import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import {
  buildCompleteProfileData,
  existingFileState,
} from "@/lib/provider/complete-profile-contract";
import { normalizeCompleteProfileSignature } from "@/lib/provider/complete-profile-update";

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
      id: schema.bahrainLawyers.id,
      countryCode: schema.bahrainLawyers.countryCode,
      subscriptionType: schema.bahrainLawyers.subscriptionType,
      subscriptionTypes: schema.bahrainLawyers.subscriptionTypes,

      fullNameAr: schema.bahrainLawyers.fullNameAr,
      fullNameEn: schema.bahrainLawyers.fullNameEn,
      email: schema.bahrainLawyers.email,
      phone: schema.bahrainLawyers.phone,

      registrationNo: schema.bahrainLawyers.registrationNo,
      registrationLevel: schema.bahrainLawyers.registrationLevel,
      experienceYears: schema.bahrainLawyers.experienceYears,
      language: schema.bahrainLawyers.language,
      workingHours: schema.bahrainLawyers.workingHours,

      specialtyMain: schema.bahrainLawyers.specialtyMain,
      specialtySubs: schema.bahrainLawyers.specialtySubs,
      specialties: schema.bahrainLawyers.specialties,

      licenseExpiryDate: schema.bahrainLawyers.licenseExpiryDate,
      ibanNumber: schema.bahrainLawyers.ibanNumber,
      crNumber: schema.bahrainLawyers.crNumber,

      profileImageFileName: schema.bahrainLawyers.profileImageFileName,
      profileImageMimeType: schema.bahrainLawyers.profileImageMimeType,
      profileImageBase64: schema.bahrainLawyers.profileImageBase64,
      profileImageUrl: schema.bahrainLawyers.profileImageUrl,

      licenseFileName: schema.bahrainLawyers.licenseFileName,
      licenseFileMimeType: schema.bahrainLawyers.licenseFileMimeType,
      licenseFileBase64: schema.bahrainLawyers.licenseFileBase64,
      licenseFileUrl: schema.bahrainLawyers.licenseFileUrl,

      ibanCertificateFileName: schema.bahrainLawyers.ibanCertificateFileName,
      ibanCertificateFileMimeType:
        schema.bahrainLawyers.ibanCertificateFileMimeType,
      ibanCertificateFileUrl: schema.bahrainLawyers.ibanCertificateFileUrl,

      institutionLicenseFileName:
        schema.bahrainLawyers.institutionLicenseFileName,
      institutionLicenseFileMimeType:
        schema.bahrainLawyers.institutionLicenseFileMimeType,
      institutionLicenseFileUrl:
        schema.bahrainLawyers.institutionLicenseFileUrl,

      personalIdFileName: schema.bahrainLawyers.personalIdFileName,
      personalIdFileMimeType: schema.bahrainLawyers.personalIdFileMimeType,
      personalIdFileUrl: schema.bahrainLawyers.personalIdFileUrl,

      signatureDataUrl: schema.bahrainLawyers.signatureDataUrl,
      agreementAccepted: schema.bahrainLawyers.agreementAccepted,

      profileCompleted: schema.bahrainLawyers.profileCompleted,
      inviteTokenExpiresAt: schema.bahrainLawyers.inviteTokenExpiresAt,
    })
    .from(schema.bahrainLawyers)
    .where(eq(schema.bahrainLawyers.inviteToken, token))
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

  const editable = buildCompleteProfileData(lawyer);
  const profileImage = existingFileState({
    fileName: lawyer.profileImageFileName,
    mimeType: lawyer.profileImageMimeType,
    url: lawyer.profileImageUrl,
    base64: lawyer.profileImageBase64,
    previewRoute:
      lawyer.profileImageBase64 && lawyer.profileImageMimeType
        ? `data:${lawyer.profileImageMimeType};base64,${lawyer.profileImageBase64}`
        : "",
  });
  const licenseFile = existingFileState({
    fileName: lawyer.licenseFileName,
    mimeType: lawyer.licenseFileMimeType,
    url: lawyer.licenseFileUrl,
    base64: lawyer.licenseFileBase64,
    previewRoute:
      lawyer.licenseFileBase64 && lawyer.licenseFileMimeType
        ? `data:${lawyer.licenseFileMimeType};base64,${lawyer.licenseFileBase64}`
        : "",
  });
  const ibanCertificateFile = existingFileState({
    fileName: lawyer.ibanCertificateFileName,
    mimeType: lawyer.ibanCertificateFileMimeType,
    url: lawyer.ibanCertificateFileUrl,
    previewRoute: "",
  });
  const institutionLicenseFile = existingFileState({
    fileName: lawyer.institutionLicenseFileName,
    mimeType: lawyer.institutionLicenseFileMimeType,
    url: lawyer.institutionLicenseFileUrl,
    previewRoute: "",
  });
  const personalIdFile = existingFileState({
    fileName: lawyer.personalIdFileName,
    mimeType: lawyer.personalIdFileMimeType,
    url: lawyer.personalIdFileUrl,
    previewRoute: "",
  });

  const signatureDataUrl = normalizeCompleteProfileSignature(
    lawyer.signatureDataUrl,
  );
  const hasSignature = Boolean(signatureDataUrl);

  const signedAgreementUrl = hasSignature
    ? `/api/provider/signed-agreement?id=${encodeURIComponent(lawyer.id)}`
    : "";

  return NextResponse.json({
    ok: true,
    lawyer: {
      ...editable,
      profileImageFileName: profileImage.fileName,
      profileImageMimeType: profileImage.mimeType,
      profileImagePreview: profileImage.preview,
      licenseFileName: licenseFile.fileName,
      licenseFileMimeType: licenseFile.mimeType,
      licenseFilePreview: licenseFile.preview,
      ibanCertificateFileName: ibanCertificateFile.fileName,
      ibanCertificateFileMimeType: ibanCertificateFile.mimeType,
      ibanCertificateFilePreview: ibanCertificateFile.preview,
      institutionLicenseFileName: institutionLicenseFile.fileName,
      institutionLicenseFileMimeType: institutionLicenseFile.mimeType,
      institutionLicenseFilePreview: institutionLicenseFile.preview,
      personalIdFileName: personalIdFile.fileName,
      personalIdFileMimeType: personalIdFile.mimeType,
      personalIdFilePreview: personalIdFile.preview,

      signatureDataUrl,
      hasSignature,
      agreementAccepted: Boolean(lawyer.agreementAccepted),
      signedAgreementUrl,
    },
  });
}
