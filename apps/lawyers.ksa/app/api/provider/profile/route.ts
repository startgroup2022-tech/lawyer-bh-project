import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db, schema } from "@/lib/db/client";
import { getProviderSessionFromRequest } from "../_session";
import {
  evaluateProviderAccess,
  getProviderAccessById,
  isProviderLicenseExpired,
} from "../_access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

type SpecialtiesObject = {
  main?: string;
  subs?: string[];
};

function formText(value: FormDataEntryValue | null, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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

function normalizeSpecialties(value: unknown): SpecialtiesObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const data = value as SpecialtiesObject;

  return {
    main: typeof data.main === "string" ? data.main : "",
    subs: Array.isArray(data.subs)
      ? data.subs.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function safeFileName(fileName: string) {
  const extension = fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
  const name = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${name || "license"}${extension}`;
}

function getFileContentType(file: File) {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }

  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".png")) return "image/png";

  return "application/octet-stream";
}

async function updateExpiredLicense(params: {
  providerId: string;
  countryCode: string;
  formData: FormData;
}) {
  const accessResult = await getProviderAccessById(
    params.providerId,
    params.countryCode,
  );

  if (!accessResult) {
    return NextResponse.json(
      { ok: false, error: "Provider not found" },
      { status: 404 },
    );
  }

  if (!accessResult.access.canUpdateLicense) {
    return NextResponse.json(
      {
        ok: false,
        error: "License update is only available when the current license is expired",
        code: "LICENSE_NOT_EXPIRED",
      },
      { status: 400 },
    );
  }

  const licenseExpiryDate = formText(
    params.formData.get("licenseExpiryDate"),
    20,
  );
  const licenseFile = params.formData.get("licenseFile");

  if (!licenseExpiryDate || isProviderLicenseExpired(licenseExpiryDate)) {
    return NextResponse.json(
      { ok: false, error: "New license expiry date must be valid and current" },
      { status: 400 },
    );
  }

  if (!(licenseFile instanceof File) || licenseFile.size === 0) {
    return NextResponse.json(
      { ok: false, error: "New license file is required" },
      { status: 400 },
    );
  }

  if (licenseFile.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { ok: false, error: "License file must be less than 5MB" },
      { status: 400 },
    );
  }

  const licenseMimeType = getFileContentType(licenseFile);
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ];

  if (!allowedTypes.includes(licenseMimeType)) {
    return NextResponse.json(
      { ok: false, error: "Invalid license file type" },
      { status: 400 },
    );
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing BLOB_READ_WRITE_TOKEN" },
      { status: 500 },
    );
  }

  const countryFolder = params.countryCode.toLowerCase();
  const blob = await put(
    `${countryFolder}/lawyers/license-files/${randomUUID()}-${safeFileName(
      licenseFile.name || "license-file",
    )}`,
    licenseFile,
    {
      access: "public",
      contentType: licenseMimeType,
      token,
    },
  );

  const currentStatus = String(
    accessResult.provider.status ?? "pending",
  ).toLowerCase();
  const canReturnToReview =
    currentStatus === "approved" ||
    (currentStatus === "suspended" &&
      accessResult.provider.suspensionType === "license_expired");
  const nextStatus = canReturnToReview
    ? "pending"
    : accessResult.provider.status;

  const [updated] = await db
    .update(schema.saudiLawyers)
    .set({
      licenseExpiryDate,
      licenseFileName: licenseFile.name || "license-file",
      licenseFileMimeType: licenseMimeType,
      licenseFileBase64: null,
      licenseFileUrl: blob.url,
      licenseFileBlobPath: blob.pathname,

      // An approved account, or an account suspended specifically because
      // the license expired, returns to review. Other suspension/rejection
      // reasons are preserved and cannot be bypassed by uploading a license.
      status: nextStatus,
      isActive: false,
      ...(canReturnToReview
        ? {
            reviewedAt: null,
            reviewedBy: null,
            suspensionType: null,
            suspensionReason: null,
            suspendedAt: null,
            suspendedBy: null,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.saudiLawyers.id, params.providerId),
        eq(schema.saudiLawyers.countryCode, params.countryCode),
      ),
    )
    .returning({
      id: schema.saudiLawyers.id,
      status: schema.saudiLawyers.status,
      isActive: schema.saudiLawyers.isActive,
      profileCompleted: schema.saudiLawyers.profileCompleted,
      licenseExpiryDate: schema.saudiLawyers.licenseExpiryDate,
    });

  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Provider not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Renewed license submitted",
    provider: {
      ...updated,
      countryCode: params.countryCode,
      access: evaluateProviderAccess(updated),
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = getProviderSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { providerId, countryCode } = session;
    const fd = await request.formData();
    const action = formText(fd.get("action"), 40);

    if (action === "update_license") {
      return await updateExpiredLicense({
        providerId,
        countryCode,
        formData: fd,
      });
    }

    const accessResult = await getProviderAccessById(providerId, countryCode);

    if (!accessResult) {
      return NextResponse.json(
        { ok: false, error: "Provider not found" },
        { status: 404 },
      );
    }

    if (!accessResult.access.canUseDashboard) {
      return NextResponse.json(
        {
          ok: false,
          error: "Account is locked",
          code: "PROVIDER_ACCOUNT_LOCKED",
          access: accessResult.access,
        },
        { status: 403 },
      );
    }

    const fullNameAr = formText(fd.get("fullNameAr"), 180);
    const fullNameEn = formText(fd.get("fullNameEn"), 180);
    const email = formText(fd.get("email"), 120).toLowerCase();
    const phone = formText(fd.get("phone"), 40);
    const language = formText(fd.get("language"), 40);
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

    if (!fullNameAr || !fullNameEn || !phone || !language) {
      return NextResponse.json(
        { ok: false, error: "Required fields are missing" },
        { status: 400 },
      );
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email address" },
        { status: 400 },
      );
    }

    if (!["Arabic", "English", "Both"].includes(language)) {
      return NextResponse.json(
        { ok: false, error: "Invalid language" },
        { status: 400 },
      );
    }

    if (!specialtyMain || specialtySubs.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Main and sub-specialty are required" },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(schema.saudiLawyers)
      .set({
        fullNameAr,
        fullNameEn,
        email: email || null,
        phone,
        language,
        specialtyMain,
        specialtySubs,
        specialties,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.saudiLawyers.id, providerId),
          eq(schema.saudiLawyers.countryCode, countryCode),
        ),
      )
      .returning({
        id: schema.saudiLawyers.id,
        subscriptionType: schema.saudiLawyers.subscriptionType,
        fullNameAr: schema.saudiLawyers.fullNameAr,
        fullNameEn: schema.saudiLawyers.fullNameEn,
        email: schema.saudiLawyers.email,
        phone: schema.saudiLawyers.phone,
        language: schema.saudiLawyers.language,
        specialtyMain: schema.saudiLawyers.specialtyMain,
        specialtySubs: schema.saudiLawyers.specialtySubs,
        specialties: schema.saudiLawyers.specialties,
        registrationNo: schema.saudiLawyers.registrationNo,
        licenseExpiryDate: schema.saudiLawyers.licenseExpiryDate,
        status: schema.saudiLawyers.status,
        isActive: schema.saudiLawyers.isActive,
        profileCompleted: schema.saudiLawyers.profileCompleted,
        profileImageUrl: schema.saudiLawyers.profileImageUrl,
      });

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Provider not found" },
        { status: 404 },
      );
    }

    const normalizedSpecialties = normalizeSpecialties(updated.specialties);

    return NextResponse.json({
      ok: true,
      provider: {
        id: updated.id,
        countryCode,
        subscriptionType: updated.subscriptionType,
        fullNameAr: updated.fullNameAr,
        fullNameEn: updated.fullNameEn,
        email: updated.email ?? "",
        phone: updated.phone,
        language: updated.language,
        specialtyMain:
          updated.specialtyMain ?? normalizedSpecialties?.main ?? null,
        specialtySubs: Array.isArray(updated.specialtySubs)
          ? updated.specialtySubs
          : Array.isArray(normalizedSpecialties?.subs)
            ? normalizedSpecialties.subs
            : [],
        specialties: normalizedSpecialties,
        registrationNo: updated.registrationNo,
        licenseExpiryDate: updated.licenseExpiryDate,
        status: updated.status,
        isActive: updated.isActive,
        profileCompleted: updated.profileCompleted,
        profileImageUrl: updated.profileImageUrl,
        access: evaluateProviderAccess(updated),
      },
    });
  } catch (err) {
    console.error("[provider/profile] failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not update profile" },
      { status: 500 },
    );
  }
}
