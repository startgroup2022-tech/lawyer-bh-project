import { NextResponse } from "next/server";
import { readDirectForm } from "@/lib/uploads/server";
import { storePrivateDocument } from "@/lib/uploads/documents";
import { parseManifest } from "@/lib/uploads/policy";
import { agreements } from "@/lib/provider-agreement/repository";
import { prepareSigning } from "@/lib/provider-agreement/builder-signing-service";
import { AgreementError } from "@/lib/provider-agreement/model";
import { setProviderSession } from "../_session";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { eq, and, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import {
  buildCountryTableSet,
  getActiveCountry,
} from "@/lib/db/country-tables";
import { createDefaultProviderCommissionRates } from "@/lib/payments/commission";
import {
  normalizeCompleteProfileSubscriptionTypes,
  normalizeCompleteProfileSignature,
  normalizeCompleteProfileText,
  preserveOrReplaceFile,
  type CompleteProfileProviderType,
  type StoredFileMetadata,
} from "@/lib/provider/complete-profile-update";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedWorkingHours = [
  "09:00-13:00",
  "13:00-17:00",
  "09:00-17:00",
] as const;

const allowedSpecialties = [
  "administrative",
  "civil",
  "commercial",
  "labor",
  "criminal",
  "sharia",
  "constitutional",
  "cassation",
  "sports",
] as const;

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-140) || "file";
}

async function uploadFile(folder: string, file: File) {
  if (!folder.endsWith('/profile-images')) {
    const field = folder.endsWith('/personal-id-files') ? 'personalIdFile' : 'licenseFile';
    const [metadata] = parseManifest('complete', [{ field, name: file.name, size: file.size, type: file.type }]);
    const blob = await storePrivateDocument(folder, file, metadata.type);
    return { fileName: file.name, mimeType: metadata.type, url: blob.url, blobPath: blob.pathname } satisfies StoredFileMetadata;
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN");
  const blob = await put(
    `${folder}/${randomUUID()}-${safeFileName(file.name)}`,
    file,
    { access: "public", contentType: file.type, token },
  );
  return {
    fileName: file.name,
    mimeType: file.type,
    url: blob.url,
    blobPath: blob.pathname,
  } satisfies StoredFileMetadata;
}

function selectedFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

function formText(value: FormDataEntryValue | null, max = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function normalizeSpecialty(value: string) {
  const normalized = value.trim();

  return allowedSpecialties.includes(
    normalized as (typeof allowedSpecialties)[number],
  )
    ? normalized
    : "";
}

function parseSpecialtySubs(value: string) {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return Array.from(
      new Set(
        parsed.filter((item): item is string =>
          allowedSpecialties.includes(
            item as (typeof allowedSpecialties)[number],
          ),
        ),
      ),
    ).slice(0, 2);
  } catch {
    return [];
  }
}

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

function isAllowedRegistrationLevel(value: string) {
  return (
    value === "cassation_lawyer" ||
    value === "practicing_lawyer" ||
    value === "trainee_lawyer"
  );
}

export async function POST(request: Request) {
  try{return await completeProfile(request);}catch(error){
    const stale=error instanceof Error&&(error.message.includes("agreement_version_stale")||(error.cause instanceof Error&&error.cause.message.includes("agreement_version_stale")));
    if(!stale)console.error("[complete-profile] request failed",{name:error instanceof Error?error.name:"unknown"});
    return NextResponse.json({ok:false,error:stale?"agreement_version_stale":"Could not save profile"},{status:stale?409:500});
  }
}

async function completeProfile(request:Request){
  let fd: FormData;

  try {
    fd = await readDirectForm(request, 'complete');
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid form data" },
      { status: 400 },
    );
  }

  const token = formText(fd.get("token"), 200);
  const normalizedText = normalizeCompleteProfileText({
    subscriptionType: formText(fd.get("subscriptionType"), 80),
    fullNameAr: formText(fd.get("fullNameAr"), 180),
    fullNameEn: formText(fd.get("fullNameEn"), 180),
    email: formText(fd.get("email"), 240),
    phone: formText(fd.get("phone"), 40),
    ibanNumber: formText(fd.get("ibanNumber"), 80),
    crNumber: formText(fd.get("crNumber"), 120),
  });
  const {
    fullNameAr,
    fullNameEn,
    email,
    phone,
    ibanNumber,
    crNumber,
  } = normalizedText;
  const { subscriptionType, subscriptionTypes } =
    normalizeCompleteProfileSubscriptionTypes(
      formText(fd.get("subscriptionTypes"), 1000),
      normalizedText.subscriptionType,
    );
  const password = formText(fd.get("password"), 120);
  const confirmPassword = formText(fd.get("confirmPassword"), 120);
  const language = formText(fd.get("language"), 40);
  const workingHours = formText(fd.get("workingHours"), 20);

  const registrationLevel = formText(fd.get("registrationLevel"), 80);
  const experienceYearsRaw = formText(fd.get("experienceYears"), 10);
  const experienceYears = Number(experienceYearsRaw);

  const specialtyMain = normalizeSpecialty(
    formText(fd.get("specialtyMain"), 80),
  );

  const specialtySubs = parseSpecialtySubs(
    formText(fd.get("specialtySubs"), 1000),
  );

  const specialties = {
    main: specialtyMain,
    subs: specialtySubs,
  };

  const licenseNumber = formText(fd.get("licenseNumber"), 80);
  const licenseExpiryDate = formText(fd.get("licenseExpiryDate"), 20);
  const signatureDataUrl = formText(fd.get("signatureDataUrl"), 300_000);
  const agreementAccepted = formText(fd.get("agreementAccepted"), 10) === "true";

  const licenseFile = selectedFile(fd.get("licenseFile"));
  const profileImageFile = selectedFile(fd.get("profileImage"));
  const ibanCertificateFile = selectedFile(fd.get("ibanCertificateFile"));
  const institutionLicenseFile = selectedFile(fd.get("institutionLicenseFile"));
  const personalIdFile = selectedFile(fd.get("personalIdFile"));

  if (
    !token ||
    !subscriptionType ||
    !fullNameAr ||
    !fullNameEn ||
    !email ||
    !phone ||
    !password ||
    !confirmPassword ||
    !language ||
    !workingHours ||
    !licenseNumber ||
    !licenseExpiryDate ||
    !ibanNumber ||
    !agreementAccepted
  ) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Invalid email address" },
      { status: 400 },
    );
  }

  if (!/^BH\d{2}[A-Z0-9]{18}$/.test(ibanNumber)) {
    return NextResponse.json(
      { ok: false, error: "Invalid IBAN" },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { ok: false, error: "Passwords do not match" },
      { status: 400 },
    );
  }

  if (!isStrongPassword(password)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Password must be at least 8 characters and include uppercase, lowercase, and a number",
      },
      { status: 400 },
    );
  }

  if (
    subscriptionType === "lawyer" &&
    !isAllowedRegistrationLevel(registrationLevel)
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid registration level" },
      { status: 400 },
    );
  }

  if (
    !allowedWorkingHours.includes(
      workingHours as (typeof allowedWorkingHours)[number],
    )
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid working hours" },
      { status: 400 },
    );
  }

  if (
    Number.isNaN(experienceYears) ||
    experienceYears < 0 ||
    experienceYears > 80
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid years of experience" },
      { status: 400 },
    );
  }

  if (!specialtyMain || specialtySubs.length !== 2) {
    return NextResponse.json(
      {
        ok: false,
        error: "Main specialty and two sub-specialties are required",
      },
      { status: 400 },
    );
  }

  const licenseExpiry = new Date(`${licenseExpiryDate}T00:00:00.000Z`);

  if (Number.isNaN(licenseExpiry.getTime())) {
    return NextResponse.json(
      { ok: false, error: "Invalid license expiry date" },
      { status: 400 },
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const approvedAt = new Date();

  if (licenseExpiry < today) {
    return NextResponse.json(
      { ok: false, error: "License expiry date cannot be in the past" },
      { status: 400 },
    );
  }

  const [lawyer] = await db
    .select({
      id: schema.bahrainLawyers.id,
      countryCode: schema.bahrainLawyers.countryCode,
      inviteTokenExpiresAt: schema.bahrainLawyers.inviteTokenExpiresAt,
      profileCompleted: schema.bahrainLawyers.profileCompleted,

      existingLicenseFileName: schema.bahrainLawyers.licenseFileName,
      existingLicenseFileMimeType: schema.bahrainLawyers.licenseFileMimeType,
      existingLicenseFileBase64: schema.bahrainLawyers.licenseFileBase64,
      existingLicenseFileUrl: schema.bahrainLawyers.licenseFileUrl,
      existingLicenseFileBlobPath: schema.bahrainLawyers.licenseFileBlobPath,

      existingProfileImageFileName: schema.bahrainLawyers.profileImageFileName,
      existingProfileImageMimeType: schema.bahrainLawyers.profileImageMimeType,
      existingProfileImageBase64: schema.bahrainLawyers.profileImageBase64,
      existingProfileImageUrl: schema.bahrainLawyers.profileImageUrl,
      existingProfileImageBlobPath: schema.bahrainLawyers.profileImageBlobPath,

      existingIbanCertificateFileName:
        schema.bahrainLawyers.ibanCertificateFileName,
      existingIbanCertificateFileMimeType:
        schema.bahrainLawyers.ibanCertificateFileMimeType,
      existingIbanCertificateFileUrl:
        schema.bahrainLawyers.ibanCertificateFileUrl,
      existingIbanCertificateFileBlobPath:
        schema.bahrainLawyers.ibanCertificateFileBlobPath,

      existingInstitutionLicenseFileName:
        schema.bahrainLawyers.institutionLicenseFileName,
      existingInstitutionLicenseFileMimeType:
        schema.bahrainLawyers.institutionLicenseFileMimeType,
      existingInstitutionLicenseFileUrl:
        schema.bahrainLawyers.institutionLicenseFileUrl,
      existingInstitutionLicenseFileBlobPath:
        schema.bahrainLawyers.institutionLicenseFileBlobPath,

      existingPersonalIdFileName: schema.bahrainLawyers.personalIdFileName,
      existingPersonalIdFileMimeType:
        schema.bahrainLawyers.personalIdFileMimeType,
      existingPersonalIdFileUrl: schema.bahrainLawyers.personalIdFileUrl,
      existingPersonalIdFileBlobPath:
        schema.bahrainLawyers.personalIdFileBlobPath,

      existingSignatureDataUrl: schema.bahrainLawyers.signatureDataUrl,
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

  let providerAgreementVersionId:string|null=null;
  let providerAgreementExtras:Record<string,string>={},providerAgreementUploadHash:string|null=null;
  try{const signing=await prepareSigning(fd,await agreements.current());providerAgreementVersionId=signing.versionId;providerAgreementExtras=signing.values;providerAgreementUploadHash=signing.uploadHash;}
  catch(error){return NextResponse.json({ok:false,error:error instanceof AgreementError?error.code:"agreement_unavailable"},{status:error instanceof AgreementError?error.status:503});}

  const finalSignatureDataUrl = normalizeCompleteProfileSignature(
    signatureDataUrl || lawyer.existingSignatureDataUrl,
  );

  if (
    !finalSignatureDataUrl
  ) {
    return NextResponse.json(
      { ok: false, error: "Signature is required" },
      { status: 400 },
    );
  }

  const hasNewLicenseFile = licenseFile !== null;
  const hasNewProfileImageFile = profileImageFile !== null;

  if (
    !hasNewLicenseFile &&
    !lawyer.existingLicenseFileBase64 &&
    !lawyer.existingLicenseFileUrl
  ) {
    return NextResponse.json(
      { ok: false, error: "License file is required" },
      { status: 400 },
    );
  }

  if (
    !hasNewProfileImageFile &&
    !lawyer.existingProfileImageBase64 &&
    !lawyer.existingProfileImageUrl
  ) {
    return NextResponse.json(
      { ok: false, error: "Profile image is required" },
      { status: 400 },
    );
  }

  if (!ibanCertificateFile && !lawyer.existingIbanCertificateFileUrl) {
    return NextResponse.json(
      { ok: false, error: "IBAN certificate is required" },
      { status: 400 },
    );
  }

  if (!personalIdFile && !lawyer.existingPersonalIdFileUrl) {
    return NextResponse.json(
      { ok: false, error: "Personal ID is required" },
      { status: 400 },
    );
  }

  const maxFileSize = 5 * 1024 * 1024;
  const replacementFiles = [
    licenseFile,
    profileImageFile,
    ibanCertificateFile,
    institutionLicenseFile,
    personalIdFile,
  ].filter((file): file is File => file !== null);

  if (replacementFiles.some((file) => file.size > maxFileSize)) {
    return NextResponse.json(
      { ok: false, error: "Files must be less than 5MB" },
      { status: 400 },
    );
  }

  const licenseAllowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];

  if (hasNewLicenseFile && !licenseAllowedTypes.includes(licenseFile.type)) {
    return NextResponse.json(
      { ok: false, error: "Invalid license file type" },
      { status: 400 },
    );
  }

  const documentFiles = [
    ibanCertificateFile,
    institutionLicenseFile,
    personalIdFile,
  ].filter((file): file is File => file !== null);

  if (documentFiles.some((file) => !licenseAllowedTypes.includes(file.type))) {
    return NextResponse.json(
      { ok: false, error: "Invalid document file type" },
      { status: 400 },
    );
  }

  const allowedImageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".avif",
    ".heic",
    ".heif",
    ".bmp",
    ".tif",
    ".tiff",
  ];

  let profileImageType =
    lawyer.existingProfileImageMimeType || "application/octet-stream";

  if (hasNewProfileImageFile) {
    const profileImageName = profileImageFile.name.toLowerCase();
    profileImageType = profileImageFile.type || "application/octet-stream";

    const hasAllowedImageExtension = allowedImageExtensions.some((ext) =>
      profileImageName.endsWith(ext),
    );

    const isAllowedImageMime =
      profileImageType.startsWith("image/") ||
      profileImageType === "application/octet-stream";

    if (
      !hasAllowedImageExtension ||
      !isAllowedImageMime ||
      profileImageType === "image/svg+xml"
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid profile image type" },
        { status: 400 },
      );
    }
  }

  const [existingLicense] = await db
    .select({
      id: schema.bahrainLawyers.id,
      registrationNo: schema.bahrainLawyers.registrationNo,
    })
    .from(schema.bahrainLawyers)
    .where(
      and(
        eq(schema.bahrainLawyers.countryCode, lawyer.countryCode),
        eq(schema.bahrainLawyers.registrationNo, licenseNumber),
        ne(schema.bahrainLawyers.id, lawyer.id),
      ),
    )
    .limit(1);

  if (existingLicense) {
    return NextResponse.json(
      { ok: false, error: "License number is already registered" },
      { status: 409 },
    );
  }

  const [existingEmail] = await db
    .select({ id: schema.bahrainLawyers.id })
    .from(schema.bahrainLawyers)
    .where(
      and(
        eq(schema.bahrainLawyers.email, email),
        ne(schema.bahrainLawyers.id, lawyer.id),
      ),
    )
    .limit(1);

  if (existingEmail) {
    return NextResponse.json(
      { ok: false, error: "Email is already registered" },
      { status: 409 },
    );
  }

  const prefix = lawyer.countryCode.toLowerCase();
  let licenseReplacement: StoredFileMetadata | null = null;
  let profileReplacement: StoredFileMetadata | null = null;
  let ibanReplacement: StoredFileMetadata | null = null;
  let institutionReplacement: StoredFileMetadata | null = null;
  let personalIdReplacement: StoredFileMetadata | null = null;

  try {
    [
      licenseReplacement,
      profileReplacement,
      ibanReplacement,
      institutionReplacement,
      personalIdReplacement,
    ] = await Promise.all([
      licenseFile
        ? uploadFile(`${prefix}/lawyers/license-files`, licenseFile)
        : null,
      profileImageFile
        ? uploadFile(`${prefix}/lawyers/profile-images`, profileImageFile)
        : null,
      ibanCertificateFile
        ? uploadFile(`${prefix}/lawyers/iban-certificates`, ibanCertificateFile)
        : null,
      institutionLicenseFile
        ? uploadFile(
            `${prefix}/lawyers/institution-licenses`,
            institutionLicenseFile,
          )
        : null,
      personalIdFile
        ? uploadFile(`${prefix}/lawyers/personal-id-files`, personalIdFile)
        : null,
    ]);
  } catch (error) {
    console.error("[complete-profile] blob upload failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not upload files" },
      { status: 500 },
    );
  }

  const finalLicense = preserveOrReplaceFile(
    {
      fileName: lawyer.existingLicenseFileName,
      mimeType: lawyer.existingLicenseFileMimeType,
      url: lawyer.existingLicenseFileUrl,
      blobPath: lawyer.existingLicenseFileBlobPath,
    },
    licenseReplacement,
  );
  const finalProfile = preserveOrReplaceFile(
    {
      fileName: lawyer.existingProfileImageFileName,
      mimeType: lawyer.existingProfileImageMimeType,
      url: lawyer.existingProfileImageUrl,
      blobPath: lawyer.existingProfileImageBlobPath,
    },
    profileReplacement,
  );
  const finalIbanCertificate = preserveOrReplaceFile(
    {
      fileName: lawyer.existingIbanCertificateFileName,
      mimeType: lawyer.existingIbanCertificateFileMimeType,
      url: lawyer.existingIbanCertificateFileUrl,
      blobPath: lawyer.existingIbanCertificateFileBlobPath,
    },
    ibanReplacement,
  );
  const finalInstitutionLicense = preserveOrReplaceFile(
    {
      fileName: lawyer.existingInstitutionLicenseFileName,
      mimeType: lawyer.existingInstitutionLicenseFileMimeType,
      url: lawyer.existingInstitutionLicenseFileUrl,
      blobPath: lawyer.existingInstitutionLicenseFileBlobPath,
    },
    institutionReplacement,
  );
  const finalPersonalId = preserveOrReplaceFile(
    {
      fileName: lawyer.existingPersonalIdFileName,
      mimeType: lawyer.existingPersonalIdFileMimeType,
      url: lawyer.existingPersonalIdFileUrl,
      blobPath: lawyer.existingPersonalIdFileBlobPath,
    },
    personalIdReplacement,
  );

  const passwordHash = await bcrypt.hash(password, 12);

  const [updated] = await db
    .update(schema.bahrainLawyers)
    .set({
      fullNameAr,
      fullNameEn,
      email,
      phone,
      passwordHash,
      language,
      workingHours,
      subscriptionType: subscriptionType as CompleteProfileProviderType,
      subscriptionTypes,

      registrationNo: licenseNumber,
      registrationLevel:
        subscriptionType === "lawyer"
          ? (registrationLevel as
              | "cassation_lawyer"
              | "practicing_lawyer"
              | "trainee_lawyer")
          : null,

      experienceYears,

      specialtyMain,
      specialtySubs,
      specialties,

      licenseExpiryDate,
      ibanNumber,
      crNumber: crNumber || null,

      licenseFileName: finalLicense.fileName,
      licenseFileMimeType: finalLicense.mimeType,
      licenseFileBase64: licenseReplacement
        ? null
        : lawyer.existingLicenseFileBase64,
      licenseFileUrl: finalLicense.url,
      licenseFileBlobPath: finalLicense.blobPath,

      profileImageFileName: finalProfile.fileName,
      profileImageMimeType: finalProfile.mimeType,
      profileImageBase64: profileReplacement
        ? null
        : lawyer.existingProfileImageBase64,
      profileImageUrl: finalProfile.url,
      profileImageBlobPath: finalProfile.blobPath,

      ibanCertificateFileName: finalIbanCertificate.fileName,
      ibanCertificateFileMimeType: finalIbanCertificate.mimeType,
      ibanCertificateFileUrl: finalIbanCertificate.url,
      ibanCertificateFileBlobPath: finalIbanCertificate.blobPath,

      institutionLicenseFileName: finalInstitutionLicense.fileName,
      institutionLicenseFileMimeType: finalInstitutionLicense.mimeType,
      institutionLicenseFileUrl: finalInstitutionLicense.url,
      institutionLicenseFileBlobPath: finalInstitutionLicense.blobPath,

      personalIdFileName: finalPersonalId.fileName,
      personalIdFileMimeType: finalPersonalId.mimeType,
      personalIdFileUrl: finalPersonalId.url,
      personalIdFileBlobPath: finalPersonalId.blobPath,

      signatureDataUrl: finalSignatureDataUrl,
      agreementAccepted: true,
      providerAgreementVersionId,
      providerAgreementDisclosed: true,
      providerAgreementExtras,
      providerAgreementUploadHash,

      status: "approved",
      isActive: true,
      profileCompleted: true,
      reviewedAt: approvedAt,
      completedProfileAt: approvedAt,

      inviteToken: null,
      inviteTokenExpiresAt: null,

      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.bahrainLawyers.id, lawyer.id),
        eq(schema.bahrainLawyers.countryCode, lawyer.countryCode),
        eq(schema.bahrainLawyers.inviteToken, token),
        eq(schema.bahrainLawyers.profileCompleted, false),
      ),
    )
    .returning({
      id: schema.bahrainLawyers.id,
      countryCode: schema.bahrainLawyers.countryCode,
      reviewedAt: schema.bahrainLawyers.reviewedAt,
      fullNameAr: schema.bahrainLawyers.fullNameAr,
      fullNameEn: schema.bahrainLawyers.fullNameEn,
      email: schema.bahrainLawyers.email,
      isActive: schema.bahrainLawyers.isActive,
      profileCompleted: schema.bahrainLawyers.profileCompleted,
    });

  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Lawyer profile not found" },
      { status: 404 },
    );
  }

  const country = await getActiveCountry(updated.countryCode);

  if (!country) {
    return NextResponse.json(
      { ok: false, error: "Registration country is not active" },
      { status: 400 },
    );
  }

  const tables = buildCountryTableSet(country);

  await createDefaultProviderCommissionRates({
    providerId: updated.id,
    countryCode: country.code,
    commissionRatesTable: tables.provider_commission_rates,
    startsAt: updated.reviewedAt ?? approvedAt,
  });

  const response = NextResponse.json({
    ok: true,
    lawyer: updated,
  });
  setProviderSession(response,updated.id,updated.countryCode);
  return response;
}
