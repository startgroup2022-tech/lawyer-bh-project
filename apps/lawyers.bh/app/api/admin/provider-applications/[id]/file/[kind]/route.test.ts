import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ allowed: true }));

vi.mock("@/lib/auth/admin-access", () => ({
  requireAdminPermission: vi.fn(async () => auth.allowed),
}));

const database = vi.hoisted(() => {
  let row: Record<string, unknown> | undefined;

  const query = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };

  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.limit.mockImplementation(async () => (row ? [row] : []));

  return {
    query,
    setRow(nextRow: Record<string, unknown>) {
      row = nextRow;
    },
    rows() {
      return row ? [row] : [];
    },
    reset() {
      row = undefined;
      query.from.mockClear();
      query.where.mockClear();
      query.limit.mockClear();
    },
  };
});

vi.mock("@/lib/db/client", () => ({
  sqlClient: vi.fn((first: unknown) => Array.isArray(first) ? Promise.resolve(database.rows()) : first),
  db: {
    select: vi.fn(() => database.query),
  },
  schema: {
    bahrainLawyers: {
      id: "id",
      profileImageFileName: "profile_image_file_name",
      profileImageMimeType: "profile_image_mime_type",
      profileImageBase64: "profile_image_base64",
      profileImageUrl: "profile_image_url",
      licenseFileName: "license_file_name",
      licenseFileMimeType: "license_file_mime_type",
      licenseFileBase64: "license_file_base64",
      licenseFileUrl: "license_file_url",
      ibanCertificateFileName: "iban_certificate_file_name",
      ibanCertificateFileMimeType: "iban_certificate_file_mime_type",
      ibanCertificateFileUrl: "iban_certificate_file_url",
      institutionLicenseFileName: "institution_license_file_name",
      institutionLicenseFileMimeType: "institution_license_file_mime_type",
      institutionLicenseFileUrl: "institution_license_file_url",
      personalIdFileName: "personal_id_file_name",
      personalIdFileMimeType: "personal_id_file_mime_type",
      personalIdFileUrl: "personal_id_file_url",
      signatureImageUrl: "signature_image_url",
      signatureDataUrl: "signature_data_url",
    },
  },
}));

vi.mock("@/lib/admin/provider-applications-repository", () => ({
  providerApplicationsRepository: {
    destination: vi.fn(async (id: string, countryCode: string) => countryCode === "BH" ? { id, countryCode, table: "bahrain_lawyers" } : null),
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => true),
}));

import { GET } from "./route";

describe("admin provider application file", () => {
  beforeEach(() => {
    database.reset();
    auth.allowed = true;
  });

  it.each([
    {
      kind: "license",
      url: "https://lawyers.bh/api/provider-documents/00000000-0000-4000-8000-000000000001",
      row: { licenseFileUrl: "/api/provider-documents/00000000-0000-4000-8000-000000000001" },
    },
    {
      kind: "profile",
      url: "https://blob.example/profile.jpg",
      row: {
        profileImageFileName: "profile.jpg",
        profileImageMimeType: "image/jpeg",
        profileImageBase64: null,
        profileImageUrl: "https://blob.example/profile.jpg",
      },
    },
    {
      kind: "license",
      url: "https://blob.example/license.png",
      row: {
        licenseFileName: "license.png",
        licenseFileMimeType: "image/png",
        licenseFileBase64: null,
        licenseFileUrl: "https://blob.example/license.png",
      },
    },
    {
      kind: "iban",
      url: "https://blob.example/iban.pdf",
      row: {
        ibanCertificateFileName: "iban.pdf",
        ibanCertificateFileMimeType: "application/pdf",
        ibanCertificateFileUrl: "https://blob.example/iban.pdf",
      },
    },
    {
      kind: "institution",
      url: "https://blob.example/cr.pdf",
      row: {
        institutionLicenseFileName: "cr.pdf",
        institutionLicenseFileMimeType: "application/pdf",
        institutionLicenseFileUrl: "https://blob.example/cr.pdf",
      },
    },
    {
      kind: "personal-id",
      url: "https://blob.example/id.pdf",
      row: {
        personalIdFileName: "id.pdf",
        personalIdFileMimeType: "application/pdf",
        personalIdFileUrl: "https://blob.example/id.pdf",
      },
    },
    {
      kind: "signature",
      url: "https://blob.example/signature.png",
      row: {
        signatureImageUrl: "https://blob.example/signature.png",
        signatureDataUrl: null,
      },
    },
  ])("redirects a Blob-backed $kind file", async ({ kind, row, url }) => {
    database.setRow(row);

    const response = await GET(new Request("https://lawyers.bh?countryCode=BH"), {
      params: Promise.resolve({ id: "lawyer-1", kind }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(url);
  });

  it("rejects file access without approvals permission", async () => {
    auth.allowed = false;
    database.setRow({ personalIdFileName: "id.pdf" });

    const response = await GET(new Request("https://lawyers.bh"), {
      params: Promise.resolve({ id: "lawyer-1", kind: "personal-id" }),
    });

    expect(response.status).toBe(403);
    expect(database.query.from).not.toHaveBeenCalled();
  });
});
