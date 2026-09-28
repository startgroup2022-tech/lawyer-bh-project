import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
  ensureCountryProvisionedForRegistration,
} from "@/lib/db/country-tables";
import { issueMobileLawyerToken } from "@/lib/mobile-lawyer-auth";
import { isEmail } from "@/lib/postmark";
import { submitJoinApplication } from "../../../join/route";
import { MAX_ATTACHMENT_BYTES } from "@/lib/communications/attachment-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedWorkingHours = [
  "09:00-13:00",
  "13:00-17:00",
  "09:00-17:00",
] as const;

function formText(value: FormDataEntryValue | null, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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

function contentTypeFromFileName(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  return "application/octet-stream";
}

function fileContentType(file: File) {
  return file.type && file.type !== "application/octet-stream"
    ? file.type
    : contentTypeFromFileName(file.name);
}

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

export async function POST(request: Request) {
  let fd: FormData;

  try {
    fd = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid form data" },
      { status: 400 },
    );
  }

  const hasFullVerificationSubmission =
    fd.get("licenseFile") instanceof File &&
    fd.get("ibanCertificateFile") instanceof File &&
    fd.get("personalIdFile") instanceof File &&
    formText(fd.get("signatureDataUrl")).startsWith("data:image/");

  // Backward compatibility: older app builds submit the whole profile and
  // all documents in one request. Keep accepting that format and mark it
  // complete immediately, just like the website's full registration form.
  if (hasFullVerificationSubmission) {
    const headers = new Headers(request.headers);
    headers.delete("content-type");

    const fullRequest = new Request(request.url, {
      method: "POST",
      headers,
      body: fd,
    });

    const response = await submitJoinApplication(fullRequest, {
      mode: "emergency-mobile",
      channel: "legalsos-mobile",
    });

    if (!response.ok) {
      return response;
    }

    const payload = (await response.json()) as {
      id?: string;
      countryCode?: string;
      [key: string]: unknown;
    };

    if (!payload.id || !payload.countryCode) {
      return NextResponse.json(
        { success: false, message: "Registration response is incomplete" },
        { status: 500 },
      );
    }

    const token = await issueMobileLawyerToken(payload.id, payload.countryCode);
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Account is unavailable", error: "account_unavailable" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        ...payload,
        success: true,
        profileCompleted: true,
        nextStep: "pending_review",
        token,
      },
      { status: response.status },
    );
  }

  const country = await ensureCountryProvisionedForRegistration(
    formText(fd.get("countryCode"), 2).toUpperCase() || "BH",
  );

  if (!country) {
    return NextResponse.json(
      { success: false, message: "Country is not available for registration" },
      { status: 400 },
    );
  }

  const fullNameAr = formText(fd.get("fullNameAr"), 180);
  const fullNameEn = formText(fd.get("fullNameEn"), 180);
  const phone = formText(fd.get("phone"), 40);
  const email = formText(fd.get("email"), 120).toLowerCase();
  const password = formText(fd.get("password"), 120);
  const confirmPassword = formText(fd.get("confirmPassword"), 120);
  const registrationNo = formText(fd.get("licenseNumber"), 80);
  const registrationLevel = formText(fd.get("registrationLevel"), 80);
  const licenseExpiryDate = formText(fd.get("licenseExpiryDate"), 20);
  const ibanNumber = formText(fd.get("ibanNumber"), 80)
    .replace(/\s+/g, "")
    .toUpperCase();
  const language = formText(fd.get("language"), 40);
  const workingHours = formText(fd.get("workingHours"), 20);
  const experienceYears = Number(formText(fd.get("experienceYears"), 10));
  const locale = formText(fd.get("lang"), 5) === "ar" ? "ar" : "en";
  const profileImage = fd.get("profileImage");

  if (
    !fullNameAr ||
    !fullNameEn ||
    !phone ||
    !email ||
    !password ||
    !confirmPassword ||
    !registrationNo ||
    !registrationLevel ||
    !licenseExpiryDate ||
    !ibanNumber ||
    !language ||
    !workingHours ||
    !Number.isFinite(experienceYears)
  ) {
    return NextResponse.json(
      { success: false, message: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!isEmail(email)) {
    return NextResponse.json(
      { success: false, message: "Invalid email" },
      { status: 400 },
    );
  }

  if (password !== confirmPassword || !isStrongPassword(password)) {
    return NextResponse.json(
      { success: false, message: "Invalid password" },
      { status: 400 },
    );
  }

  if (experienceYears < 0 || experienceYears > 80) {
    return NextResponse.json(
      { success: false, message: "Invalid years of experience" },
      { status: 400 },
    );
  }

  if (!allowedWorkingHours.includes(
    workingHours as (typeof allowedWorkingHours)[number],
  )) {
    return NextResponse.json(
      { success: false, message: "Invalid professional details" },
      { status: 400 },
    );
  }

  if (!new RegExp(`^${country.code}[0-9A-Z]{13,32}$`).test(ibanNumber)) {
    return NextResponse.json(
      { success: false, message: `Invalid IBAN number for ${country.code}` },
      { status: 400 },
    );
  }

  const expiry = new Date(`${licenseExpiryDate}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (Number.isNaN(expiry.getTime()) || expiry < today) {
    return NextResponse.json(
      { success: false, message: "Invalid license expiry date" },
      { status: 400 },
    );
  }

  if (!(profileImage instanceof File) || profileImage.size === 0) {
    return NextResponse.json(
      { success: false, message: "Profile image is required" },
      { status: 400 },
    );
  }

  if (profileImage.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json(
      { success: false, message: "Profile image must not exceed 2 MB" },
      { status: 400 },
    );
  }

  const imageType = fileContentType(profileImage);
  if (!imageType.startsWith("image/") || imageType === "image/svg+xml") {
    return NextResponse.json(
      { success: false, message: "Invalid profile image" },
      { status: 400 },
    );
  }

  const tables = buildCountryTableSet(country);
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Missing BLOB_READ_WRITE_TOKEN" },
      { status: 500 },
    );
  }

  try {
    const duplicateRows = await sqlClient`
      SELECT id, email, registration_no
      FROM ${sqlClient(tables.lawyers)}
      WHERE lower(email) = ${email}
         OR registration_no = ${registrationNo}
      LIMIT 1
    `;

    if (duplicateRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Email or license number is already registered",
        },
        { status: 409 },
      );
    }

    const blob = await put(
      `${country.tablePrefix}/lawyers/profile-images/${randomUUID()}-${safeFileName(
        profileImage.name || "profile-image",
      )}`,
      profileImage,
      {
        access: "public",
        contentType: imageType,
        token,
      },
    );

    const passwordHash = await bcrypt.hash(password, 12);
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = request.headers.get("user-agent");
    const specialtySubs: string[] = [];
    const specialties = { main: null, subs: specialtySubs };

    const rows = await sqlClient`
      INSERT INTO ${sqlClient(tables.lawyers)} (
        country_code, subscription_type, full_name_ar, full_name_en,
        registration_no, registration_level, iban_number,
        experience_years, phone, email, password_hash,
        language, working_hours, specialty_main, specialty_subs, specialties,
        profile_image_file_name, profile_image_mime_type,
        profile_image_url, profile_image_blob_path,
        license_expiry_date, agreement_accepted,
        status, is_active, profile_completed,
        locale, ip_address, user_agent
      ) VALUES (
        ${country.code}, ${"lawyer"}, ${fullNameAr}, ${fullNameEn},
        ${registrationNo}, ${registrationLevel}, ${ibanNumber},
        ${experienceYears}, ${phone}, ${email}, ${passwordHash},
        ${language}, ${workingHours}, ${null},
        ${sqlClient.json(specialtySubs)}, ${sqlClient.json(specialties)},
        ${profileImage.name}, ${imageType}, ${blob.url}, ${blob.pathname},
        ${licenseExpiryDate}, ${false},
        ${"pending"}, ${false}, ${false},
        ${locale}, ${ipAddress}, ${userAgent}
      )
      RETURNING id
    `;

    const created = rows[0] as { id?: string } | undefined;

    if (!created?.id) {
      throw new Error("Insert did not return a lawyer id");
    }

    const appToken = await issueMobileLawyerToken(created.id, country.code);
    if (!appToken) {
      return NextResponse.json(
        { success: false, message: "Account is unavailable", error: "account_unavailable" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        ok: true,
        id: created.id,
        countryCode: country.code,
        status: "profile_incomplete",
        profileCompleted: false,
        nextStep: "complete_profile",
        token: appToken,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[mobile lawyer register] failed", error);

    return NextResponse.json(
      { success: false, message: "Could not create lawyer account" },
      { status: 500 },
    );
  }

}
