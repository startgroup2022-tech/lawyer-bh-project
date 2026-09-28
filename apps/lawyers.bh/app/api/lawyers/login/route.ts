import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { getActiveCountry } from "@/lib/db/country-tables";
import { issueMobileLawyerToken } from "@/lib/mobile-lawyer-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mobileStatus(status: string) {
  return status === "pending" ? "pending_review" : status;
}

function logDatabaseDiagnostic() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log("LAWYER_LOGIN_DATABASE_DIAGNOSTIC", {
      databaseUrlPresent: false,
      host: null,
      database: null,
    });

    return;
  }

  try {
    const parsed = new URL(databaseUrl);

    console.log("LAWYER_LOGIN_DATABASE_DIAGNOSTIC", {
      databaseUrlPresent: true,
      protocol: parsed.protocol,
      host: parsed.hostname,
      database: parsed.pathname.replace(/^\/+/, "") || null,
    });
  } catch {
    console.log("LAWYER_LOGIN_DATABASE_DIAGNOSTIC", {
      databaseUrlPresent: true,
      validUrl: false,
      host: null,
      database: null,
    });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        licenseNumber?: string;
        password?: string;
        countryCode?: string;
      }
    | null;

  const licenseNumber = String(body?.licenseNumber || "").trim();
  const password = String(body?.password || "");

  const requestedCountryCode = String(body?.countryCode || "BH")
    .trim()
    .toUpperCase();

  console.log("LAWYER_LOGIN_REQUEST", {
    requestedLicenseNumber: licenseNumber,
    requestedCountryCode,
    hasPassword: password.length > 0,
    passwordLength: password.length,
  });

  // آمن: لا يطبع رابط قاعدة البيانات أو اسم المستخدم أو كلمة المرور.
  logDatabaseDiagnostic();

  const country = await getActiveCountry(requestedCountryCode);

  if (!country) {
    console.log("LAWYER_LOGIN_COUNTRY_NOT_ACTIVE", {
      requestedLicenseNumber: licenseNumber,
      requestedCountryCode,
    });

    return NextResponse.json(
      {
        success: false,
        message: "Country is not active",
      },
      { status: 400 },
    );
  }

  console.log("LAWYER_LOGIN_COUNTRY_DIAGNOSTIC", {
    requestedCountryCode,
    resolvedCountryCode: country.code,
    tablePrefix: country.tablePrefix,
  });

  if (!licenseNumber || !password) {
    console.log("LAWYER_LOGIN_MISSING_FIELDS", {
      requestedLicenseNumber: licenseNumber,
      requestedCountryCode: country.code,
      hasLicenseNumber: Boolean(licenseNumber),
      hasPassword: Boolean(password),
    });

    return NextResponse.json(
      {
        success: false,
        message: "License number and password are required",
      },
      { status: 400 },
    );
  }

  const [lawyer] = await db
    .select({
      id: schema.bahrainLawyers.id,
      countryCode: schema.bahrainLawyers.countryCode,
      registrationNo: schema.bahrainLawyers.registrationNo,
      passwordHash: schema.bahrainLawyers.passwordHash,
      status: schema.bahrainLawyers.status,
      isActive: schema.bahrainLawyers.isActive,
      isEmergencyReady: schema.bahrainLawyers.isEmergencyReady,
      phone: schema.bahrainLawyers.phone,
    })
    .from(schema.bahrainLawyers)
    .where(
      and(
        eq(schema.bahrainLawyers.countryCode, country.code),
        eq(schema.bahrainLawyers.registrationNo, licenseNumber),
      ),
    )
    .limit(1);

  const hasPasswordHash = Boolean(lawyer?.passwordHash);

  const passwordMatches = lawyer?.passwordHash
    ? await bcrypt.compare(password, lawyer.passwordHash)
    : false;

  console.log("LAWYER_LOGIN_DIAGNOSTIC", {
    requestedLicenseNumber: licenseNumber,
    requestedCountryCode: country.code,

    lawyerFound: Boolean(lawyer),

    foundLawyerId: lawyer?.id ?? null,
    foundCountryCode: lawyer?.countryCode ?? null,
    foundRegistrationNo: lawyer?.registrationNo ?? null,

    hasPasswordHash,
    passwordMatches,

    status: lawyer?.status ?? null,
    isActive: lawyer?.isActive ?? null,
    isEmergencyReady: lawyer?.isEmergencyReady ?? null,
  });

  if (!lawyer?.passwordHash || !passwordMatches) {
    console.log("LAWYER_LOGIN_REJECTED_INVALID_DETAILS", {
      requestedLicenseNumber: licenseNumber,
      requestedCountryCode: country.code,
      lawyerFound: Boolean(lawyer),
      hasPasswordHash,
      passwordMatches,
    });

    return NextResponse.json(
      {
        success: false,
        message: "Invalid login details",
      },
      { status: 401 },
    );
  }

  if (lawyer.status === "rejected" || lawyer.status === "suspended") {
    console.log("LAWYER_LOGIN_REJECTED_ACCOUNT_STATUS", {
      lawyerId: lawyer.id,
      registrationNo: lawyer.registrationNo,
      status: lawyer.status,
    });

    return NextResponse.json(
      {
        success: false,
        message: "Account is not available",
      },
      { status: 403 },
    );
  }

  const token = await issueMobileLawyerToken(
    lawyer.id,
    lawyer.countryCode,
  );
  if (!token) {
    return NextResponse.json({ success: false, message: "Account is not available" }, { status: 403 });
  }

  const isAvailable =
    lawyer.isActive &&
    lawyer.isEmergencyReady;

  console.log("LAWYER_LOGIN_SUCCESS", {
    lawyerId: lawyer.id,
    countryCode: lawyer.countryCode,
    registrationNo: lawyer.registrationNo,
    status: lawyer.status,
    isActive: lawyer.isActive,
    isEmergencyReady: lawyer.isEmergencyReady,
    isAvailable,
  });

  return NextResponse.json({
    success: true,
    data: {
      id: lawyer.id,
      countryCode: lawyer.countryCode,
      licenseNumber: lawyer.registrationNo,
      phone: lawyer.phone,
      status: mobileStatus(lawyer.status),
      isAvailable,
      token,
    },
  });
}
