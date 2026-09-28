import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/db/client";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { providerApplicationsRepository } from "@/lib/admin/provider-applications-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    id: string;
    kind: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id, kind } = await params;

  if (!(await requireAdminPermission("manage_approvals"))) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  if (!id || !["profile", "license", "iban", "institution", "personal-id", "signature"].includes(kind)) {
    return NextResponse.json(
      { ok: false, error: "Invalid file request" },
      { status: 400 },
    );
  }
  const countryCode = new URL(_request.url).searchParams.get("countryCode") ?? "";
  const destination = await providerApplicationsRepository.destination(id, countryCode);
  if (!destination) return NextResponse.json({ok:false,error:"Application not found"},{status:404});

  const [application] = await sqlClient<Record<string,string|null>[] >`
    SELECT profile_image_file_name AS "profileImageFileName",profile_image_mime_type AS "profileImageMimeType",
      profile_image_base64 AS "profileImageBase64",profile_image_url AS "profileImageUrl",
      license_file_name AS "licenseFileName",license_file_mime_type AS "licenseFileMimeType",
      license_file_base64 AS "licenseFileBase64",license_file_url AS "licenseFileUrl",
      iban_certificate_file_name AS "ibanCertificateFileName",iban_certificate_file_mime_type AS "ibanCertificateFileMimeType",
      iban_certificate_file_url AS "ibanCertificateFileUrl",institution_license_file_name AS "institutionLicenseFileName",
      institution_license_file_mime_type AS "institutionLicenseFileMimeType",institution_license_file_url AS "institutionLicenseFileUrl",
      personal_id_file_name AS "personalIdFileName",personal_id_file_mime_type AS "personalIdFileMimeType",
      personal_id_file_url AS "personalIdFileUrl",signature_image_url AS "signatureImageUrl",signature_data_url AS "signatureDataUrl"
    FROM ${sqlClient(destination.table)} WHERE id=${id}::uuid AND country_code=${destination.countryCode} LIMIT 1`;

  if (!application) {
    return NextResponse.json(
      { ok: false, error: "Application not found" },
      { status: 404 },
    );
  }

  const files = {
    profile: {
      fileName: application.profileImageFileName,
      mimeType: application.profileImageMimeType,
      base64: application.profileImageBase64,
      fileUrl: application.profileImageUrl,
    },
    license: {
      fileName: application.licenseFileName,
      mimeType: application.licenseFileMimeType,
      base64: application.licenseFileBase64,
      fileUrl: application.licenseFileUrl,
    },
    iban: {
      fileName: application.ibanCertificateFileName,
      mimeType: application.ibanCertificateFileMimeType,
      base64: null,
      fileUrl: application.ibanCertificateFileUrl,
    },
    institution: {
      fileName: application.institutionLicenseFileName,
      mimeType: application.institutionLicenseFileMimeType,
      base64: null,
      fileUrl: application.institutionLicenseFileUrl,
    },
    "personal-id": {
      fileName: application.personalIdFileName,
      mimeType: application.personalIdFileMimeType,
      base64: null,
      fileUrl: application.personalIdFileUrl,
    },
    signature: {
      fileName: "signature.png",
      mimeType: "image/png",
      base64: application.signatureDataUrl?.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "") ?? null,
      fileUrl: application.signatureImageUrl,
    },
  } as const;
  const { fileName, mimeType, base64, fileUrl } = files[kind as keyof typeof files];

  if (fileUrl) {
    try {
      if (/^\/api\/provider-documents\/[a-f0-9-]+$/.test(fileUrl)) {
        return NextResponse.redirect(new URL(fileUrl, _request.url));
      }
      const parsedUrl = new URL(fileUrl);

      if (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") {
        return NextResponse.redirect(parsedUrl);
      }
    } catch {
      // Fall through to the legacy Base64 response when the stored URL is invalid.
    }
  }

  if (!fileName || !mimeType || !base64) {
    return NextResponse.json(
      { ok: false, error: "File not found" },
      { status: 404 },
    );
  }

  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
