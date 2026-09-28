import crypto from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";

import { db, schema, sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
  getActiveCountry,
} from "@/lib/db/country-tables";
import { getAdminSession } from "@/lib/auth/admin-session";
import { sendEmail } from "@/lib/postmark";
import { sendLawyerInvitationEmail } from "@/lib/admin/lawyer-invitation-email";
import {
  serializeInvitationSpecialties,
  serializeInvitationTimestamps,
} from "@/lib/admin/lawyer-invitation-db";
import { generateLawyerMembershipNo } from "@/lib/db/membership-no";

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

function isEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

function makeInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getBaseUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get("origin") ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
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

async function optionalFileToBase64(
  file: FormDataEntryValue | null,
) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  const maxFileSize = 5 * 1024 * 1024;

  if (file.size > maxFileSize) {
    throw new Error("File must be less than 5MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    name: file.name,
    type: file.type || "application/octet-stream",
    base64: buffer.toString("base64"),
  };
}

export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  let fd: FormData;

  try {
    fd = await request.formData();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid form data",
      },
      {
        status: 400,
      },
    );
  }

  const requestedCountryCode =
    formText(fd.get("countryCode"), 2).toUpperCase() || "BH";

  const country = await getActiveCountry(requestedCountryCode);

  if (!country) {
    return NextResponse.json(
      {
        ok: false,
        error: "Country is not active or its tables are not ready",
      },
      {
        status: 400,
      },
    );
  }

  const countryTables = buildCountryTableSet(country);

  const fullNameAr = formText(fd.get("fullNameAr"), 180);
  const fullNameEn = formText(fd.get("fullNameEn"), 180);
  const email = formText(fd.get("email"), 120).toLowerCase();
  const phone = formText(fd.get("phone"), 40);

  const lang =
    formText(fd.get("lang"), 5) === "en" ? "en" : "ar";

  const licenseNumber = formText(
    fd.get("licenseNumber"),
    80,
  );

  const licenseExpiryDate = formText(
    fd.get("licenseExpiryDate"),
    20,
  );

  const registrationLevel = formText(
    fd.get("registrationLevel"),
    80,
  );

  const experienceYearsRaw = formText(
    fd.get("experienceYears"),
    10,
  );

  const language =
    formText(fd.get("language"), 40) || "Arabic";

  const workingHours =
    formText(fd.get("workingHours"), 20) ||
    "09:00-13:00";

  const specialtyMain = normalizeSpecialty(
    formText(fd.get("specialtyMain"), 80),
  );

  const specialtySubs = parseSpecialtySubs(
    formText(fd.get("specialtySubs"), 1000),
  );

  const {
    specialtySubsJson,
    specialtiesJson,
  } = serializeInvitationSpecialties(
    specialtyMain,
    specialtySubs,
  );

  const signatureDataUrl = formText(
    fd.get("signatureDataUrl"),
    300_000,
  );

  if (!fullNameAr || !email || !phone) {
    return NextResponse.json(
      {
        ok: false,
        error: "Name, email, and phone are required",
      },
      {
        status: 400,
      },
    );
  }

  if (!isEmail(email)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid email",
      },
      {
        status: 400,
      },
    );
  }

  if (
    workingHours &&
    !allowedWorkingHours.includes(
      workingHours as (typeof allowedWorkingHours)[number],
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid working hours",
      },
      {
        status: 400,
      },
    );
  }

  const experienceYears =
    experienceYearsRaw &&
    !Number.isNaN(Number(experienceYearsRaw))
      ? Number(experienceYearsRaw)
      : 0;

  if (
    experienceYears < 0 ||
    experienceYears > 80
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid years of experience",
      },
      {
        status: 400,
      },
    );
  }

  const [existingEmail] = await db
    .select({
      id: schema.bahrainLawyers.id,
      email: schema.bahrainLawyers.email,
    })
    .from(schema.bahrainLawyers)
    .where(
      and(
        eq(
          schema.bahrainLawyers.email,
          email,
        ),
        eq(
          schema.bahrainLawyers.countryCode,
          country.code,
        ),
      ),
    )
    .limit(1);

  if (existingEmail) {
    return NextResponse.json(
      {
        ok: false,
        error: "Email already exists",
      },
      {
        status: 409,
      },
    );
  }

  if (licenseNumber) {
    const [existingLicense] = await db
      .select({
        id: schema.bahrainLawyers.id,
      })
      .from(schema.bahrainLawyers)
      .where(
        and(
          eq(
            schema.bahrainLawyers.registrationNo,
            licenseNumber,
          ),
          eq(
            schema.bahrainLawyers.countryCode,
            country.code,
          ),
        ),
      )
      .limit(1);

    if (existingLicense) {
      return NextResponse.json(
        {
          ok: false,
          error: "License number already exists",
        },
        {
          status: 409,
        },
      );
    }
  }

  let profileImage:
    | {
        name: string;
        type: string;
        base64: string;
      }
    | null = null;

  let licenseFile:
    | {
        name: string;
        type: string;
        base64: string;
      }
    | null = null;

  let signatureFile:
    | {
        name: string;
        type: string;
        base64: string;
      }
    | null = null;

  try {
    profileImage = await optionalFileToBase64(
      fd.get("profileImage"),
    );

    licenseFile = await optionalFileToBase64(
      fd.get("licenseFile"),
    );

    signatureFile = await optionalFileToBase64(
      fd.get("signatureFile"),
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Invalid file",
      },
      {
        status: 400,
      },
    );
  }

  const inviteToken = makeInviteToken();

  const invitedAt = new Date();

  const inviteTokenExpiresAt = new Date(
    invitedAt.getTime() +
      1000 * 60 * 60 * 24 * 14,
  );

  const {
    invitedAtIso,
    inviteTokenExpiresAtIso,
  } = serializeInvitationTimestamps(
    invitedAt,
    inviteTokenExpiresAt,
  );

  // إذا الأدمن ما كتب رقم الرخصة،
  // ننشئ رقم مؤقت لأن registration_no مطلوب و unique
  const registrationNo =
    licenseNumber ||
    `INV-${crypto.randomUUID()}`;

  // كلمة مرور مؤقتة
  // المحامي يغيرها عند إكمال بيانات الحساب
  const tempPassword =
    crypto.randomBytes(12).toString("hex");

  const passwordHash =
    await bcrypt.hash(tempPassword, 12);

  /*
   * مهم:
   * بما أن المحامي سيتم إنشاؤه بحالة approved،
   * يجب إنشاء membership_no قبل عملية INSERT.
   *
   * مثال:
   * LBH-001001
   * LBH-001002
   */
  const membershipNo =
    await generateLawyerMembershipNo(country);

  const signatureValue =
    signatureDataUrl ||
    (signatureFile
      ? `data:${signatureFile.type};base64,${signatureFile.base64}`
      : null);

  const createdRows = await sqlClient`
    INSERT INTO ${sqlClient(countryTables.lawyers)} (
      country_code,
      full_name_ar,
      full_name_en,
      email,
      phone,
      registration_no,
      membership_no,
      registration_level,
      subscription_type,
      experience_years,
      password_hash,
      language,
      working_hours,
      specialty_main,
      specialty_subs,
      specialties,
      license_expiry_date,
      license_file_name,
      license_file_mime_type,
      license_file_base64,
      profile_image_file_name,
      profile_image_mime_type,
      profile_image_base64,
      signature_data_url,
      agreement_accepted,
      status,
      is_active,
      profile_completed,
      invite_token,
      invite_token_expires_at,
      invited_at,
      locale
    )
    VALUES (
      ${country.code},
      ${fullNameAr},
      ${fullNameEn},
      ${email},
      ${phone},
      ${registrationNo},
      ${membershipNo},
      ${
        registrationLevel === "cassation_lawyer" ||
        registrationLevel === "practicing_lawyer" ||
        registrationLevel === "trainee_lawyer"
          ? registrationLevel
          : null
      },
      ${"lawyer"},
      ${experienceYears},
      ${passwordHash},
      ${language},
      ${workingHours},
      ${specialtyMain || null},
      ${specialtySubsJson}::jsonb,
      ${specialtiesJson}::jsonb,
      ${licenseExpiryDate || null},
      ${licenseFile?.name ?? null},
      ${licenseFile?.type ?? null},
      ${licenseFile?.base64 ?? null},
      ${profileImage?.name ?? null},
      ${profileImage?.type ?? null},
      ${profileImage?.base64 ?? null},
      ${signatureValue},
      ${false},
      ${"approved"},
      ${false},
      ${false},
      ${inviteToken},
      ${inviteTokenExpiresAtIso}::timestamptz,
      ${invitedAtIso}::timestamptz,
      ${lang}
    )
    RETURNING
      id,
      full_name_ar,
      full_name_en,
      email,
      phone,
      invite_token,
      membership_no
  `;

  const createdRow = createdRows[0] as
    | {
        id: string;
        full_name_ar: string;
        full_name_en: string;
        email: string | null;
        phone: string;
        invite_token: string | null;
        membership_no: string | null;
      }
    | undefined;

  if (!createdRow) {
    return NextResponse.json(
      {
        ok: false,
        error: "Could not create invitation",
      },
      {
        status: 500,
      },
    );
  }

  const created = {
    id: createdRow.id,
    countryCode: country.code,
    fullNameAr: createdRow.full_name_ar,
    fullNameEn: createdRow.full_name_en,
    email: createdRow.email,
    phone: createdRow.phone,
    inviteToken: createdRow.invite_token,
    membershipNo: createdRow.membership_no,
  };

  const baseUrl = getBaseUrl(request);

  const completionLink =
    `${baseUrl}/${lang}/complete-profile?token=${inviteToken}`;

  const whatsappText =
    lang === "ar"
      ? `مرحباً ${fullNameAr}، تم إنشاء حسابك في منصة المحامين. يرجى إكمال بياناتك من الرابط التالي:\n${completionLink}`
      : `Hello ${fullNameEn}, your lawyer platform account has been created. Please complete your profile using this link:\n${completionLink}`;

  const whatsappLink = phone
    ? `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
        whatsappText,
      )}`
    : "";

  let emailSent = false;
  let emailError: string | null = null;

  try {
    await sendLawyerInvitationEmail(
      {
        to: email,
        lawyerName:
          lang === "ar"
            ? fullNameAr
            : fullNameEn,
        completionLink,
      },
      sendEmail,
    );

    emailSent = true;
  } catch (error) {
    emailError =
      "Lawyer was added, but the invitation email could not be sent";

    console.error(
      "[admin-lawyer-invite] automatic email failed",
      {
        lawyerId: created.id,
        error:
          error instanceof Error
            ? error.message
            : "Unknown email error",
      },
    );
  }

  return NextResponse.json({
    ok: true,
    lawyer: created,
    completionLink,
    whatsappLink,
    emailSent,
    emailError,
  });
}