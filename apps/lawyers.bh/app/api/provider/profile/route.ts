import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db, schema } from "@/lib/db/client";
import { getProviderSessionFromRequest } from "../_session";
import {
  evaluateProviderAccess,
  getProviderAccessById,
} from "../_access";
import {
  resolveLicenseMimeType,
  validateLicenseRenewalInput,
  type LicenseRenewalErrorCode,
} from "@/lib/provider/license-renewal-validation";
import {
  diffSensitiveProfileValues,
  hasProfileChanges,
  mergePendingProfileValues,
  providerRoles,
  type ProviderProfileChangeValues,
} from "@/lib/provider/profile-change-policy";
import {
  validateProfileChangeSubmission,
  type ProfileChangeFileKind,
} from "@/lib/provider/profile-change-validation";

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

const fileFields = {
  profileImage: "profileImage",
  licenseFile: "licenseFile",
  ibanCertificate: "ibanCertificate",
  institutionLicense: "institutionLicense",
  personalId: "personalId",
  signature: "signature",
} as const;

function parseRoles(value: FormDataEntryValue | null) {
  try {
    const parsed = JSON.parse(typeof value === "string" ? value : "[]");
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set<string>(providerRoles);
    return Array.from(new Set(parsed.map(String).filter((role) => allowed.has(role))));
  } catch {
    return [];
  }
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
        code: "LICENSE_UPDATE_NOT_ALLOWED",
      },
      { status: 400 },
    );
  }

  const licenseExpiryDate = formText(
    params.formData.get("licenseExpiryDate"),
    20,
  );
  const licenseFile = params.formData.get("licenseFile");
  const selectedFile = licenseFile instanceof File ? licenseFile : null;
  const validationErrors = validateLicenseRenewalInput({
    licenseExpiryDate,
    file: selectedFile,
  });
  const validationCode =
    validationErrors.licenseExpiryDate ?? validationErrors.licenseFile;

  if (validationCode) {
    const errorMessages: Record<LicenseRenewalErrorCode, string> = {
      LICENSE_EXPIRY_REQUIRED: "New license expiry date is required",
      LICENSE_EXPIRY_INVALID: "New license expiry date must be after today",
      LICENSE_FILE_REQUIRED: "New license file is required",
      LICENSE_FILE_TOO_LARGE: "License file must be 5MB or smaller",
      LICENSE_FILE_TYPE_INVALID: "Invalid license file type",
      LICENSE_UPDATE_NOT_ALLOWED: "License update is not allowed",
      LICENSE_UPLOAD_FAILED: "License upload failed",
    };

    return NextResponse.json(
      { ok: false, error: errorMessages[validationCode], code: validationCode },
      { status: 400 },
    );
  }

  if (!selectedFile) {
    return NextResponse.json(
      {
        ok: false,
        error: "New license file is required",
        code: "LICENSE_FILE_REQUIRED",
      },
      { status: 400 },
    );
  }

  const licenseMimeType = resolveLicenseMimeType(selectedFile);

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
      selectedFile.name || "license-file",
    )}`,
    selectedFile,
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
    .update(schema.bahrainLawyers)
    .set({
      licenseExpiryDate,
      licenseFileName: selectedFile.name || "license-file",
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
        eq(schema.bahrainLawyers.id, params.providerId),
        eq(schema.bahrainLawyers.countryCode, params.countryCode),
      ),
    )
    .returning({
      id: schema.bahrainLawyers.id,
      status: schema.bahrainLawyers.status,
      isActive: schema.bahrainLawyers.isActive,
      profileCompleted: schema.bahrainLawyers.profileCompleted,
      licenseExpiryDate: schema.bahrainLawyers.licenseExpiryDate,
      suspensionType: schema.bahrainLawyers.suspensionType,
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

    const [current] = await db
      .select()
      .from(schema.bahrainLawyers)
      .where(
        and(
          eq(schema.bahrainLawyers.id, providerId),
          eq(schema.bahrainLawyers.countryCode, countryCode),
        ),
      )
      .limit(1);
    if (!current) {
      return NextResponse.json({ ok: false, error: "Provider not found" }, { status: 404 });
    }

    const fullNameAr = formText(fd.get("fullNameAr"), 180);
    const fullNameEn = formText(fd.get("fullNameEn"), 180);
    const email = formText(fd.get("email"), 120).toLowerCase();
    const phone = formText(fd.get("phone"), 40);
    const language = formText(fd.get("language"), 40);
    const workingHours = formText(fd.get("workingHours"), 200);
    const experienceYears = Math.max(0, Math.min(80, Number.parseInt(formText(fd.get("experienceYears"), 3), 10) || 0));
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

    if (email && email !== (current.email ?? "").toLowerCase()) {
      return NextResponse.json(
        { ok: false, error: "Verify the new email address separately", code: "EMAIL_VERIFICATION_REQUIRED" },
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

    const submitted: Record<string, unknown> = {
      fullNameAr,
      fullNameEn,
      registrationNo: formText(fd.get("registrationNo"), 100),
      registrationLevel: formText(fd.get("registrationLevel"), 80) || null,
      ibanNumber: formText(fd.get("ibanNumber"), 80),
      licenseExpiryDate: formText(fd.get("licenseExpiryDate"), 20),
      crNumber: formText(fd.get("crNumber"), 100) || null,
      subscriptionTypes: parseRoles(fd.get("subscriptionTypes")),
    };
    if ((submitted.subscriptionTypes as string[]).length === 0) {
      return NextResponse.json({ ok: false, error: "At least one provider role is required", code: "PROFILE_CHANGE_INVALID", fields: { subscriptionTypes: "ROLE_REQUIRED" } }, { status: 400 });
    }
    const approved: ProviderProfileChangeValues = {
      fullNameAr: current.fullNameAr,
      fullNameEn: current.fullNameEn,
      registrationNo: current.registrationNo,
      registrationLevel: current.registrationLevel,
      ibanNumber: current.ibanNumber,
      licenseExpiryDate: current.licenseExpiryDate,
      crNumber: current.crNumber,
      subscriptionTypes: current.subscriptionTypes,
    };
    const scalarPatch = diffSensitiveProfileValues(approved, submitted);
    const selectedFiles = Object.fromEntries(
      Object.entries(fileFields)
        .map(([kind, field]) => [kind, fd.get(field)])
        .filter((entry): entry is [string, File] => entry[1] instanceof File && entry[1].size > 0),
    ) as Partial<Record<ProfileChangeFileKind, File>>;
    const [existingPending] = await db
      .select()
      .from(schema.providerProfileChangeRequests)
      .where(and(
        eq(schema.providerProfileChangeRequests.providerId, providerId),
        eq(schema.providerProfileChangeRequests.countryCode, countryCode),
        eq(schema.providerProfileChangeRequests.status, "pending"),
      ))
      .limit(1);
    const existingFiles = existingPending?.proposedFiles ?? {};
    const retainedFile = (kind: string) => existingFiles[kind]
      ? ({ name: existingFiles[kind].fileName, type: existingFiles[kind].mimeType, size: 1 } as File)
      : undefined;
    const validationErrors = validateProfileChangeSubmission({
      approvedIban: current.ibanNumber,
      ibanNumber: scalarPatch.ibanNumber === undefined ? current.ibanNumber : scalarPatch.ibanNumber,
      approvedLicenseExpiryDate: current.licenseExpiryDate,
      licenseExpiryDate: scalarPatch.licenseExpiryDate === undefined ? current.licenseExpiryDate : scalarPatch.licenseExpiryDate,
      registrationChanged: scalarPatch.registrationNo !== undefined || scalarPatch.registrationLevel !== undefined,
      profileImage: selectedFiles.profileImage ?? retainedFile("profileImage"),
      licenseFile: selectedFiles.licenseFile ?? retainedFile("licenseFile"),
      ibanCertificate: selectedFiles.ibanCertificate ?? retainedFile("ibanCertificate"),
      institutionLicense: selectedFiles.institutionLicense ?? retainedFile("institutionLicense"),
      personalId: selectedFiles.personalId ?? retainedFile("personalId"),
      signature: selectedFiles.signature ?? retainedFile("signature"),
    });
    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json({ ok: false, error: "Profile change validation failed", code: "PROFILE_CHANGE_INVALID", fields: validationErrors }, { status: 400 });
    }

    const proposedValues = mergePendingProfileValues(
      approved,
      (existingPending?.proposedValues ?? {}) as ProviderProfileChangeValues,
      submitted,
    );
    const proposedFiles = { ...(existingPending?.proposedFiles ?? {}) };
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (Object.keys(selectedFiles).length > 0 && !token) {
      return NextResponse.json({ ok: false, error: "File storage is unavailable", code: "PROFILE_FILE_UPLOAD_FAILED" }, { status: 500 });
    }
    for (const [kind, selectedFile] of Object.entries(selectedFiles)) {
      const blob = await put(
        `${countryCode.toLowerCase()}/lawyers/profile-changes/${providerId}/${randomUUID()}-${safeFileName(selectedFile.name || kind)}`,
        selectedFile,
        { access: "public", contentType: selectedFile.type, token: token! },
      );
      proposedFiles[kind] = { fileName: selectedFile.name || kind, mimeType: selectedFile.type, url: blob.url, blobPath: blob.pathname };
    }

    await db.transaction(async (tx) => {
      await tx.update(schema.bahrainLawyers).set({
        phone,
        language,
        workingHours: workingHours || null,
        experienceYears,
        specialtyMain,
        specialtySubs,
        specialties,
        updatedAt: new Date(),
      }).where(and(
        eq(schema.bahrainLawyers.id, providerId),
        eq(schema.bahrainLawyers.countryCode, countryCode),
      ));

      if (!hasProfileChanges(proposedValues, Object.keys(proposedFiles))) {
        if (existingPending) {
          await tx.update(schema.providerProfileChangeRequests).set({ status: "cancelled", updatedAt: new Date() }).where(eq(schema.providerProfileChangeRequests.id, existingPending.id));
        }
      } else if (existingPending) {
        await tx.update(schema.providerProfileChangeRequests).set({ proposedValues, proposedFiles, updatedAt: new Date() }).where(eq(schema.providerProfileChangeRequests.id, existingPending.id));
      } else {
        await tx.insert(schema.providerProfileChangeRequests).values({ providerId, countryCode, proposedValues, proposedFiles }).onConflictDoUpdate({
          target: [schema.providerProfileChangeRequests.providerId, schema.providerProfileChangeRequests.countryCode],
          targetWhere: sql`${schema.providerProfileChangeRequests.status} = 'pending'`,
          set: { proposedValues, proposedFiles, updatedAt: new Date() },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      appliedDirectChanges: true,
      pendingReview: hasProfileChanges(proposedValues, Object.keys(proposedFiles)),
    });
  } catch (err) {
    console.error("[provider/profile] failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not update profile" },
      { status: 500 },
    );
  }
}
