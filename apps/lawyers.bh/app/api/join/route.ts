import { NextResponse } from "next/server";
import { readDirectForm } from "@/lib/uploads/server";
import { invalidDocumentResponse, withDocumentField } from "@/lib/uploads/document-error";
import { storePrivateDocument } from "@/lib/uploads/documents";
import bcrypt from "bcryptjs";
import { sqlClient } from "@/lib/db/client";
import { isEmail } from "@/lib/postmark";
import type { EmailLang } from "@/lib/emailTemplates";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { setProviderSession } from "../provider/_session";
import {
  ensureCountryProvisionedForRegistration,
  getActiveCountry,
} from "@/lib/db/country-tables";
import {
  resolveLawyerProfessionalProfile,
  type LawyerRegistrationMode,
} from "@/lib/registration/lawyer-professional-profile-policy";
import { sendLawyerRegistrationEmails } from "@/lib/registration/lawyer-registration-emails";
import { JOIN_PROFILE_IMAGE_MAX_SIZE } from "@/lib/registration/join-step-validation";
import { getPublishedTerms } from "@/lib/terms-management/service";
import { agreements } from "@/lib/provider-agreement/repository";
import { prepareSigning } from "@/lib/provider-agreement/builder-signing-service";
import { AgreementError } from "@/lib/provider-agreement/model";
import {
  RegistrationRoutingError,
  resolveRegistrationCountry,
  type RegistrationChannel,
} from "@/lib/registration/legalsos-registration";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";
import { MAX_ATTACHMENT_BYTES } from "@/lib/communications/attachment-policy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const providerTypes = [
  "lawyer",
  "consultant",
  "mediator",
  "arbitrator",
  "expert",
  "private_executor",
  "private_notary",
  "translator",
] as const;

type ProviderType = (typeof providerTypes)[number];

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

type UploadedBlob = {
  url: string;
  pathname: string;
};

function formText(value: FormDataEntryValue | null, max = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function safeFileName(fileName: string) {
  const ext = fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";

  const name = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${name || "file"}${ext}`;
}

function extensionFromMimeType(contentType: string) {
  switch (contentType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "application/pdf":
      return ".pdf";
    default:
      return "";
  }
}

function contentTypeFromFileName(fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".tif") || lower.endsWith(".tiff")) return "image/tiff";

  return "application/octet-stream";
}

function getFileContentType(file: File) {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }

  return contentTypeFromFileName(file.name);
}

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) return null;

  const contentType = match[1];
  const base64 = match[2];

  return {
    buffer: Buffer.from(base64, "base64"),
    contentType,
    extension: extensionFromMimeType(contentType),
  };
}

async function uploadToBlob(params: {
  folder: string;
  file: File | Buffer;
  fileName: string;
  contentType: string;
}): Promise<UploadedBlob> {
  if (!params.folder.endsWith('/profile-images')) return storePrivateDocument(params.folder, params.file, params.contentType);
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN");
  }

  const blob = await put(
    `${params.folder}/${randomUUID()}-${safeFileName(params.fileName)}`,
    params.file,
    {
      access: "public",
      contentType: params.contentType,
      token,
    },
  );

  return {
    url: blob.url,
    pathname: blob.pathname,
  };
}

function normalizeSubscriptionType(value: string): ProviderType | null {
  const normalized = value.trim().toLowerCase();

  const map: Record<string, ProviderType> = {
    lawyer: "lawyer",
    "محامي": "lawyer",

    consultant: "consultant",
    "مستشار": "consultant",

    mediator: "mediator",
    "وسيط": "mediator",

    arbitrator: "arbitrator",
    "محكم": "arbitrator",

    expert: "expert",
    "خبير": "expert",

    private_executor: "private_executor",
    "private executor": "private_executor",
    "منفذ خاص": "private_executor",

    private_notary: "private_notary",
    "private notary": "private_notary",
    "موثق خاص": "private_notary",

    translator: "translator",
    "مترجم": "translator",
  };

  return map[normalized] ?? null;
}

function parseSubscriptionTypes(
  rawTypes: string,
  fallbackType: string,
): ProviderType[] {
  let values: string[] = [];

  if (rawTypes) {
    try {
      const parsed = JSON.parse(rawTypes);

      if (Array.isArray(parsed)) {
        values = parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      values = rawTypes.split(",");
    }
  }

  if (values.length === 0 && fallbackType) {
    values = [fallbackType];
  }

  return Array.from(
    new Set(
      values
        .map((value) => normalizeSubscriptionType(value))
        .filter((value): value is ProviderType => Boolean(value)),
    ),
  ).slice(0, providerTypes.length);
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

export async function submitJoinApplication(
  request: Request,
  options: { mode: LawyerRegistrationMode; channel: RegistrationChannel },
) {
  let fd: FormData;

  try {
    fd = await readDirectForm(request, 'join');
  } catch (error) {
    const documentResponse = invalidDocumentResponse(error);
    if (documentResponse) return documentResponse;
    return NextResponse.json(
      { ok: false, error: "Invalid form data" },
      { status: 400 },
    );
  }

  const lang: EmailLang = formText(fd.get("lang"), 5) === "ar" ? "ar" : "en";

  const isMobileRegistration = options.channel === "legalsos-mobile";

  const rawSubscriptionType = formText(fd.get("subscriptionType"), 80);
  const rawSubscriptionTypes = formText(fd.get("subscriptionTypes"), 1000);
  const subscriptionTypes = parseSubscriptionTypes(
    rawSubscriptionTypes,
    rawSubscriptionType,
  );
  const subscriptionType = subscriptionTypes.includes("lawyer")
    ? "lawyer"
    : subscriptionTypes[0] ?? null;
  const notaryId = formText(fd.get("notaryId"), 120);
  const fullNameAr = formText(fd.get("fullNameAr"), 180);
  const fullNameEn = formText(fd.get("fullNameEn"), 180);

  const email = formText(fd.get("email"), 120).toLowerCase();
  const phone = formText(fd.get("phone"), 40);
  const password = formText(fd.get("password"), 120);
  const confirmPassword = formText(fd.get("confirmPassword"), 120);
  const language =
    formText(fd.get("language"), 40) || (lang === "ar" ? "Arabic" : "English");

  const experienceYearsRaw = formText(fd.get("experienceYears"), 10);
  const experienceYears = Number(experienceYearsRaw);

  const workingHours = formText(fd.get("workingHours"), 20);
  const registrationLevel = formText(fd.get("registrationLevel"), 80);
  const specialtyMain = normalizeSpecialty(
    formText(fd.get("specialtyMain"), 80),
  );
  const specialtySubs = parseSpecialtySubs(
    formText(fd.get("specialtySubs"), 1000),
  );
  const crNumber = formText(fd.get("crNumber"), 80);
  const licenseExpiryDate = formText(fd.get("licenseExpiryDate"), 20);
  const licenseNumber = formText(fd.get("licenseNumber"), 80);
  const ibanNumber = formText(fd.get("ibanNumber"), 80)
  .replace(/\s+/g, "")
  .toUpperCase();
  const signatureDataUrl = formText(fd.get("signatureDataUrl"), 300_000);
  const termsVersionId = formText(fd.get("termsVersionId"), 80);

  const licenseFile = fd.get("licenseFile");
  const institutionLicenseFile = fd.get("institutionLicenseFile");
  const profileImageFile = fd.get("profileImage");
  const ibanCertificateFile = fd.get("ibanCertificateFile");
  const personalIdFile = fd.get("personalIdFile");

  let registrationRoute: Awaited<ReturnType<typeof resolveRegistrationCountry>>;
  try {
    registrationRoute = await resolveRegistrationCountry({
      formData: fd,
      channel: options.channel,
      loadCountry:
        options.channel === "lawyers-bh-web"
          ? getActiveCountry
          : ensureCountryProvisionedForRegistration,
    });
  } catch (error) {
    if (error instanceof RegistrationRoutingError) {
      const publicMessage =
        error.code === "WEBSITE_BAHRAIN_ONLY"
          ? "Website registration is available for Bahrain only"
          : "Country is not active or its tables are not ready";

      return NextResponse.json(
        { ok: false, error: publicMessage, code: error.code },
        { status: 400 },
      );
    }
    throw error;
  }

  const { country: routedCountry, lawyersTable } = registrationRoute;

  if (!routedCountry) {
    return NextResponse.json(
      { ok: false, error: "Country is not active or its tables are not ready" },
      { status: 400 },
    );
  }

  let country = routedCountry;
  if (options.channel === "lawyers-bh-web") {
    try {
      country = await requireCountryProduct(routedCountry.code, "lawyers");
    } catch (error) {
      const mapped = mapCountryProductAccessError(error);
      if (mapped) {
        return NextResponse.json(
          { ok: false, ...mapped.body, code: mapped.body.error },
          { status: mapped.status },
        );
      }
      throw error;
    }
  }

  const countryCode = country.code;
  let providerAgreementVersionId:string|null=null;
  let providerAgreementExtras:Record<string,string>={},providerAgreementUploadHash:string|null=null;
  if(options.channel === "lawyers-bh-web"&&countryCode==="BH"){
    try{const signing=await prepareSigning(fd,await agreements.current());providerAgreementVersionId=signing.versionId;providerAgreementExtras=signing.values;providerAgreementUploadHash=signing.uploadHash;}
    catch(error){return NextResponse.json({ok:false,error:error instanceof AgreementError?error.code:"agreement_unavailable"},{status:error instanceof AgreementError?error.status:503});}
  }

  const registrationTermsType = options.channel === "legalsos-web"
    ? "legalsos_lawyer_agreement"
    : "lawyer_registration";
  const publishedRegistrationTerms = await getPublishedTerms(
    registrationTermsType,
    options.channel === "legalsos-web" ? { countryCode } : undefined,
  ).catch((error) => {
    console.error("[join] failed to load lawyer registration terms", error);
    return null;
  });
  if (!isMobileRegistration && (!termsVersionId || !publishedRegistrationTerms)) {
    return NextResponse.json({ ok: false, error: "AGREEMENT_UNAVAILABLE", code: "AGREEMENT_UNAVAILABLE" }, { status: 400 });
  }
  if (termsVersionId && publishedRegistrationTerms?.id !== termsVersionId) {
    return NextResponse.json({ ok: false, error: "AGREEMENT_STALE", code: "AGREEMENT_STALE" }, { status: 409 });
  }

  if (typeof lawyersTable !== "string") {
    console.error("[join] invalid lawyers table", {
      countryCode,
      lawyersTable,
    });

    return NextResponse.json(
      { ok: false, error: "Invalid country table configuration" },
      { status: 500 },
    );
  }

  if (!licenseNumber) {
    return NextResponse.json(
      { ok: false, error: "license_or_personal_number_required" },
      { status: 400 },
    );
  }

  if (
    !subscriptionType ||
    !fullNameAr ||
    !fullNameEn ||
    !email ||
    !phone ||
    !password ||
    !confirmPassword ||
    !language ||
!licenseExpiryDate ||
!ibanNumber
  ) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!isEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "Invalid email" },
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

  const professionalProfileResult = resolveLawyerProfessionalProfile({
    mode: options.mode,
    requiresRegistrationLevel: subscriptionTypes.includes("lawyer"),
    registrationLevel,
    workingHours,
    specialtyMain,
    specialtySubs,
  });

  if (!professionalProfileResult.ok) {
    return NextResponse.json(
      { ok: false, error: professionalProfileResult.error },
      { status: 400 },
    );
  }

  const professionalProfile = professionalProfileResult.profile;

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

  try {
    const rows = await sqlClient`
      SELECT id, email, registration_no
      FROM ${sqlClient(lawyersTable)}
      WHERE lower(email) = ${email}
         OR registration_no = ${licenseNumber}
      LIMIT 1
    `;

    const existingLawyer = rows[0] as
      | { id: string; email: string | null; registration_no: string }
      | undefined;

    if (existingLawyer?.email?.toLowerCase() === email) {
      return NextResponse.json(
        { ok: false, error: "Email is already registered in this country" },
        { status: 409 },
      );
    }

    if (existingLawyer?.registration_no === licenseNumber) {
      return NextResponse.json(
        { ok: false, error: "License number is already registered in this country" },
        { status: 409 },
      );
    }
  } catch (err) {
    console.error("[join] duplicate check failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not verify application details" },
      { status: 500 },
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

  if (licenseExpiry < today) {
    return NextResponse.json(
      { ok: false, error: "License expiry date cannot be in the past" },
      { status: 400 },
    );
  }

const ibanPattern = new RegExp(`^${countryCode}[0-9A-Z]{13,32}$`);

if (!ibanPattern.test(ibanNumber)) {
  return NextResponse.json(
    {
      ok: false,
      error: `Invalid IBAN number for ${countryCode}`,
    },
    { status: 400 },
  );
}


  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/")) {
    return NextResponse.json(
      { ok: false, error: "Signature is required" },
      { status: 400 },
    );
  }

  const signatureImage = dataUrlToBuffer(signatureDataUrl);

  if (!signatureImage || !signatureImage.contentType.startsWith("image/")) {
    return NextResponse.json(
      { ok: false, error: "Invalid signature image" },
      { status: 400 },
    );
  }

  if (!(licenseFile instanceof File) || licenseFile.size === 0) {
    return NextResponse.json(
      { ok: false, error: "License file is required" },
      { status: 400 },
    );
  }

  const maxFileSize = isMobileRegistration
    ? MAX_ATTACHMENT_BYTES
    : 5 * 1024 * 1024;
  const maxFileSizeLabel = isMobileRegistration ? "2 MB" : "5 MB";

  if (licenseFile.size > maxFileSize) {
    return NextResponse.json(
      { ok: false, error: `License file must not exceed ${maxFileSizeLabel}` },
      { status: 400 },
    );
  }



  const licenseFileType = getFileContentType(licenseFile);

  const allowedLicenseTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];

  if (!allowedLicenseTypes.includes(licenseFileType)) {
    return NextResponse.json(
      { ok: false, error: "Invalid license file type" },
      { status: 400 },
    );
  }

  const hasInstitutionLicenseFile =
    institutionLicenseFile instanceof File && institutionLicenseFile.size > 0;
  let institutionLicenseFileType: string | null = null;

  if (hasInstitutionLicenseFile) {
    if (institutionLicenseFile.size > maxFileSize) {
      return NextResponse.json(
        { ok: false, error: `Institution license file must not exceed ${maxFileSizeLabel}` },
        { status: 400 },
      );
    }

    institutionLicenseFileType = getFileContentType(institutionLicenseFile);

    if (!allowedLicenseTypes.includes(institutionLicenseFileType)) {
      return NextResponse.json(
        { ok: false, error: "Invalid institution license file type" },
        { status: 400 },
      );
    }
  }

if (
  !(ibanCertificateFile instanceof File) ||
  ibanCertificateFile.size === 0
) {
  return NextResponse.json(
    { ok: false, error: "IBAN certificate is required" },
    { status: 400 },
  );
}

if (ibanCertificateFile.size > maxFileSize) {
  return NextResponse.json(
    { ok: false, error: `IBAN certificate must not exceed ${maxFileSizeLabel}` },
    { status: 400 },
  );
}

const ibanCertificateFileType = getFileContentType(ibanCertificateFile);

const allowedIbanCertificateTypes = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

if (!allowedIbanCertificateTypes.includes(ibanCertificateFileType)) {
  return NextResponse.json(
    { ok: false, error: "Invalid IBAN certificate file type" },
    { status: 400 },
  );
}

if (!(personalIdFile instanceof File) || personalIdFile.size === 0) {
  return NextResponse.json(
    { ok: false, error: "Personal ID file is required" },
    { status: 400 },
  );
}

if (personalIdFile.size > maxFileSize) {
  return NextResponse.json(
    { ok: false, error: `Personal ID file must not exceed ${maxFileSizeLabel}` },
    { status: 400 },
  );
}

const personalIdFileType = getFileContentType(personalIdFile);

const allowedPersonalIdFileTypes = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

if (!allowedPersonalIdFileTypes.includes(personalIdFileType)) {
  return NextResponse.json(
    { ok: false, error: "Invalid personal ID file type" },
    { status: 400 },
  );
}

  if (!(profileImageFile instanceof File) || profileImageFile.size === 0) {
    return NextResponse.json(
      { ok: false, error: "Profile image is required" },
      { status: 400 },
    );
  }

  const profileImageTooLarge = isMobileRegistration
    ? profileImageFile.size > MAX_ATTACHMENT_BYTES
    : profileImageFile.size > JOIN_PROFILE_IMAGE_MAX_SIZE;
  if (profileImageTooLarge) {
    return NextResponse.json(
      { ok: false, error: `Profile image must not exceed ${isMobileRegistration ? "2 MB" : "3 MB"}` },
      { status: 400 },
    );
  }

  const profileImageName = profileImageFile.name.toLowerCase();
  const profileImageType = getFileContentType(profileImageFile);

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

let licenseFileBlob: UploadedBlob;
let institutionLicenseFileBlob: UploadedBlob | null = null;
let ibanCertificateFileBlob: UploadedBlob;
let personalIdFileBlob: UploadedBlob;
let profileImageBlob: UploadedBlob;
let signatureImageBlob: UploadedBlob;

  try {
    [
  licenseFileBlob,
  ibanCertificateFileBlob,
  personalIdFileBlob,
  profileImageBlob,
  signatureImageBlob,
] = await Promise.all([
        withDocumentField("licenseFile", () => uploadToBlob({
          folder: `${country.tablePrefix}/lawyers/license-files`,
          file: licenseFile,
          fileName: licenseFile.name || "license-file",
          contentType: licenseFileType,
        })),
withDocumentField("ibanCertificateFile", () => uploadToBlob({
  folder: `${country.tablePrefix}/lawyers/iban-certificates`,
  file: ibanCertificateFile,
  fileName: ibanCertificateFile.name || "iban-certificate",
  contentType: ibanCertificateFileType,
})),
withDocumentField("personalIdFile", () => uploadToBlob({
  folder: `${country.tablePrefix}/lawyers/personal-id-files`,
  file: personalIdFile,
  fileName: personalIdFile.name || "personal-id-file",
  contentType: personalIdFileType,
})),
        uploadToBlob({
          folder: `${country.tablePrefix}/lawyers/profile-images`,
          file: profileImageFile,
          fileName: profileImageFile.name || "profile-image",
          contentType: profileImageType,
        }),

        uploadToBlob({
          folder: `${country.tablePrefix}/lawyers/signatures`,
          file: signatureImage.buffer,
          fileName: `signature-${licenseNumber}${signatureImage.extension}`,
          contentType: signatureImage.contentType,
        }),
      ]);

    if (
      hasInstitutionLicenseFile &&
      institutionLicenseFileType &&
      institutionLicenseFile instanceof File
    ) {
      institutionLicenseFileBlob = await withDocumentField("institutionLicenseFile", () => uploadToBlob({
        folder: `${country.tablePrefix}/lawyers/institution-licenses`,
        file: institutionLicenseFile,
        fileName: institutionLicenseFile.name || "institution-license",
        contentType: institutionLicenseFileType,
      }));
    }
  } catch (err) {
    const documentResponse = invalidDocumentResponse(err);
    if (documentResponse) return documentResponse;
    console.error("[join] blob upload failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not upload files" },
      { status: 500 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const userAgent = request.headers.get("user-agent");

  let applicationId: string;

  try {
    const rows = await sqlClient`
      INSERT INTO ${sqlClient(lawyersTable)} (
        country_code, notary_id, subscription_type, subscription_types,
        full_name, full_name_ar, full_name_en, registration_no, registration_level,
        experience_years, email, phone, password_hash, language, working_hours,
        specialty_main, specialty_subs, specialties, cr_number,
        institution_license_file_name, institution_license_file_mime_type,
        institution_license_file_url, institution_license_file_blob_path,
        license_expiry_date, license_file_name,
        license_file_mime_type, license_file_base64, license_file_url,
        license_file_blob_path, iban_number, iban_certificate_file_name,
        iban_certificate_file_mime_type, iban_certificate_file_url,
        iban_certificate_file_blob_path, personal_id_file_name,
        personal_id_file_mime_type, personal_id_file_url,
        personal_id_file_blob_path, profile_image_file_name,
        profile_image_mime_type, profile_image_base64, profile_image_url,
        profile_image_blob_path, signature_data_url, signature_image_url,
        signature_image_blob_path, agreement_accepted, status, is_active,
        profile_completed, completed_profile_at,
        locale, ip_address, user_agent
        ${countryCode==="BH"?sqlClient`, provider_agreement_version_id, provider_agreement_disclosed, provider_agreement_extras, provider_agreement_upload_hash`:sqlClient``}
      ) VALUES (
        ${countryCode}, ${notaryId || null}, ${subscriptionType},
        ${JSON.stringify(subscriptionTypes)}::jsonb,
        ${fullNameAr}, ${fullNameAr}, ${fullNameEn}, ${licenseNumber},
        ${professionalProfile.registrationLevel},
        ${experienceYears}, ${email}, ${phone}, ${passwordHash}, ${language},
        ${professionalProfile.workingHours}, ${professionalProfile.specialtyMain},
        ${JSON.stringify(professionalProfile.specialtySubs)}::json,
        ${JSON.stringify(professionalProfile.specialties)}::json,
        ${crNumber || null},
        ${
          institutionLicenseFile instanceof File && institutionLicenseFile.size > 0
            ? institutionLicenseFile.name
            : null
        },
        ${institutionLicenseFileType},
        ${institutionLicenseFileBlob?.url ?? null},
        ${institutionLicenseFileBlob?.pathname ?? null},
        ${licenseExpiryDate}, ${licenseFile.name}, ${licenseFileType}, ${null},
        ${licenseFileBlob.url}, ${licenseFileBlob.pathname}, ${ibanNumber},
        ${ibanCertificateFile.name}, ${ibanCertificateFileType},
        ${ibanCertificateFileBlob.url}, ${ibanCertificateFileBlob.pathname},
        ${personalIdFile.name}, ${personalIdFileType},
        ${personalIdFileBlob.url}, ${personalIdFileBlob.pathname},
        ${profileImageFile.name}, ${profileImageType}, ${null},
        ${profileImageBlob.url}, ${profileImageBlob.pathname},
        ${signatureDataUrl}, ${signatureImageBlob.url},
        ${signatureImageBlob.pathname}, ${true}, ${"pending"}, ${false},
        ${true}, now(),
        ${lang}, ${ipAddress}, ${userAgent}
        ${countryCode==="BH"?sqlClient`, ${providerAgreementVersionId}, ${options.channel === "lawyers-bh-web"}, ${JSON.stringify(providerAgreementExtras)}::text::jsonb, ${providerAgreementUploadHash}`:sqlClient``}
      )
      RETURNING id
    `;

    const created = rows[0] as { id: string } | undefined;

    if (!created?.id) {
      throw new Error("Insert did not return an application id");
    }

    applicationId = created.id;

    if (publishedRegistrationTerms && termsVersionId) {
      await sqlClient`INSERT INTO lawyer_terms_acceptances
        (lawyer_id,terms_version_id,accepted_ip,accepted_user_agent)
        VALUES(${applicationId}::uuid,${termsVersionId}::uuid,${ipAddress},${userAgent})
        ON CONFLICT (lawyer_id,terms_version_id) DO NOTHING`;
    }
  } catch (err) {
    if(err instanceof Error&&err.message.includes("agreement_version_stale"))return NextResponse.json({ok:false,error:"agreement_version_stale"},{status:409});
    console.error("[join] database save failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not save application" },
      { status: 500 },
    );
  }

await sendLawyerRegistrationEmails({
  applicationId,
  countryCode,
  email,
  phone,
  fullNameAr,
  fullNameEn,
  licenseNumber,
  locale: lang,
  channel: options.channel,
});

const response = NextResponse.json({
  ok: true,
  id: applicationId,
  reference: applicationId,
  autoLoggedIn: true,
  status: "pending",
  profileCompleted: true,
  countryCode,
  redirectTo: `/${lang}/provider-dashboard?pending=1`,
});

setProviderSession(response, applicationId, countryCode);

return response;
}

export async function POST(request: Request) {
  return submitJoinApplication(request, {
    mode: "web",
    channel: "lawyers-bh-web",
  });
}
