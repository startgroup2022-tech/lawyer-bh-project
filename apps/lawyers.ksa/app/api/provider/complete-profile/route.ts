import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq, and, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

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
  let fd: FormData;

  try {
    fd = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid form data" },
      { status: 400 },
    );
  }

  const token = formText(fd.get("token"), 200);
  const fullNameAr = formText(fd.get("fullNameAr"), 180);
  const fullNameEn = formText(fd.get("fullNameEn"), 180);
  const phone = formText(fd.get("phone"), 40);
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

  const licenseFile = fd.get("licenseFile");
  const profileImageFile = fd.get("profileImage");

  if (
    !token ||
    !fullNameAr ||
    !fullNameEn ||
    !phone ||
    !password ||
    !confirmPassword ||
    !language ||
    !workingHours ||
    !registrationLevel ||
    !licenseNumber ||
    !licenseExpiryDate
  ) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
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

  if (!isAllowedRegistrationLevel(registrationLevel)) {
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

  if (!specialtyMain || specialtySubs.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Main specialty and at least one sub-specialty are required",
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

  if (licenseExpiry < today) {
    return NextResponse.json(
      { ok: false, error: "License expiry date cannot be in the past" },
      { status: 400 },
    );
  }

  const [lawyer] = await db
    .select({
      id: schema.saudiLawyers.id,
      countryCode: schema.saudiLawyers.countryCode,
      inviteTokenExpiresAt: schema.saudiLawyers.inviteTokenExpiresAt,
      profileCompleted: schema.saudiLawyers.profileCompleted,

      existingLicenseFileName: schema.saudiLawyers.licenseFileName,
      existingLicenseFileMimeType: schema.saudiLawyers.licenseFileMimeType,
      existingLicenseFileBase64: schema.saudiLawyers.licenseFileBase64,

      existingProfileImageFileName: schema.saudiLawyers.profileImageFileName,
      existingProfileImageMimeType: schema.saudiLawyers.profileImageMimeType,
      existingProfileImageBase64: schema.saudiLawyers.profileImageBase64,

      existingSignatureDataUrl: schema.saudiLawyers.signatureDataUrl,
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

  const finalSignatureDataUrl =
    signatureDataUrl || lawyer.existingSignatureDataUrl || "";

  if (
    !finalSignatureDataUrl ||
    !finalSignatureDataUrl.startsWith("data:image/")
  ) {
    return NextResponse.json(
      { ok: false, error: "Signature is required" },
      { status: 400 },
    );
  }

  const hasNewLicenseFile = licenseFile instanceof File && licenseFile.size > 0;
  const hasNewProfileImageFile =
    profileImageFile instanceof File && profileImageFile.size > 0;

  if (!hasNewLicenseFile && !lawyer.existingLicenseFileBase64) {
    return NextResponse.json(
      { ok: false, error: "License file is required" },
      { status: 400 },
    );
  }

  if (!hasNewProfileImageFile && !lawyer.existingProfileImageBase64) {
    return NextResponse.json(
      { ok: false, error: "Profile image is required" },
      { status: 400 },
    );
  }

  const maxFileSize = 5 * 1024 * 1024;

  if (
    (hasNewLicenseFile && licenseFile.size > maxFileSize) ||
    (hasNewProfileImageFile && profileImageFile.size > maxFileSize)
  ) {
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
      id: schema.saudiLawyers.id,
      registrationNo: schema.saudiLawyers.registrationNo,
    })
    .from(schema.saudiLawyers)
    .where(
      and(
        eq(schema.saudiLawyers.countryCode, lawyer.countryCode),
        eq(schema.saudiLawyers.registrationNo, licenseNumber),
        ne(schema.saudiLawyers.id, lawyer.id),
      ),
    )
    .limit(1);

  if (existingLicense) {
    return NextResponse.json(
      { ok: false, error: "License number is already registered" },
      { status: 409 },
    );
  }

  const licenseBuffer = hasNewLicenseFile
    ? Buffer.from(await licenseFile.arrayBuffer())
    : null;

  const profileImageBuffer = hasNewProfileImageFile
    ? Buffer.from(await profileImageFile.arrayBuffer())
    : null;

  const passwordHash = await bcrypt.hash(password, 12);

  const [updated] = await db
    .update(schema.saudiLawyers)
    .set({
      fullNameAr,
      fullNameEn,
      phone,
      passwordHash,
      language,
      workingHours,

      registrationNo: licenseNumber,
      registrationLevel:
        registrationLevel as
          | "cassation_lawyer"
          | "practicing_lawyer"
          | "trainee_lawyer",

      experienceYears,

      specialtyMain,
      specialtySubs,
      specialties,

      licenseExpiryDate,

      licenseFileName: hasNewLicenseFile
        ? licenseFile.name
        : lawyer.existingLicenseFileName,

      licenseFileMimeType: hasNewLicenseFile
        ? licenseFile.type
        : lawyer.existingLicenseFileMimeType,

      licenseFileBase64: hasNewLicenseFile
        ? licenseBuffer!.toString("base64")
        : lawyer.existingLicenseFileBase64,

      profileImageFileName: hasNewProfileImageFile
        ? profileImageFile.name
        : lawyer.existingProfileImageFileName,

      profileImageMimeType: hasNewProfileImageFile
        ? profileImageType
        : lawyer.existingProfileImageMimeType,

      profileImageBase64: hasNewProfileImageFile
        ? profileImageBuffer!.toString("base64")
        : lawyer.existingProfileImageBase64,

      signatureDataUrl: finalSignatureDataUrl,
      agreementAccepted: true,

      status: "approved",
      isActive: true,
      profileCompleted: true,
      completedProfileAt: new Date(),

      inviteToken: null,
      inviteTokenExpiresAt: null,

      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.saudiLawyers.id, lawyer.id),
        eq(schema.saudiLawyers.countryCode, lawyer.countryCode),
      ),
    )
    .returning({
      id: schema.saudiLawyers.id,
      countryCode: schema.saudiLawyers.countryCode,
      fullNameAr: schema.saudiLawyers.fullNameAr,
      fullNameEn: schema.saudiLawyers.fullNameEn,
      email: schema.saudiLawyers.email,
      isActive: schema.saudiLawyers.isActive,
      profileCompleted: schema.saudiLawyers.profileCompleted,
    });

  return NextResponse.json({
    ok: true,
    lawyer: updated,
  });
}