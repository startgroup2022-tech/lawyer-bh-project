import type { ProviderProfileChangeValues } from "./profile-change-policy";

export type ProposedProfileFile = {
  fileName: string;
  mimeType: string;
  url: string;
  blobPath: string;
};

export type ProposedProfileFiles = Partial<Record<
  "profileImage" | "licenseFile" | "ibanCertificate" | "institutionLicense" | "personalId" | "signature",
  ProposedProfileFile
>>;

const scalarColumns = new Set([
  "fullNameAr",
  "fullNameEn",
  "subscriptionTypes",
  "registrationNo",
  "registrationLevel",
  "ibanNumber",
  "licenseExpiryDate",
  "crNumber",
]);

const fileColumns = {
  profileImage: { name: "profileImageFileName", mime: "profileImageMimeType", base64: "profileImageBase64", url: "profileImageUrl", path: "profileImageBlobPath" },
  licenseFile: { name: "licenseFileName", mime: "licenseFileMimeType", base64: "licenseFileBase64", url: "licenseFileUrl", path: "licenseFileBlobPath" },
  ibanCertificate: { name: "ibanCertificateFileName", mime: "ibanCertificateFileMimeType", base64: null, url: "ibanCertificateFileUrl", path: "ibanCertificateFileBlobPath" },
  institutionLicense: { name: "institutionLicenseFileName", mime: "institutionLicenseFileMimeType", base64: null, url: "institutionLicenseFileUrl", path: "institutionLicenseFileBlobPath" },
  personalId: { name: "personalIdFileName", mime: "personalIdFileMimeType", base64: null, url: "personalIdFileUrl", path: "personalIdFileBlobPath" },
  signature: { name: null, mime: null, base64: "signatureDataUrl", url: "signatureImageUrl", path: "signatureImageBlobPath" },
} as const;

export function buildApprovedProviderPatch(
  values: ProviderProfileChangeValues | Record<string, unknown>,
  files: ProposedProfileFiles,
) {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (scalarColumns.has(key)) patch[key] = value;
  }
  if (Array.isArray(values.subscriptionTypes) && values.subscriptionTypes.length > 0) {
    patch.subscriptionType = values.subscriptionTypes.includes("lawyer")
      ? "lawyer"
      : values.subscriptionTypes[0];
  }
  for (const [kind, file] of Object.entries(files) as [keyof ProposedProfileFiles, ProposedProfileFile][]) {
    const columns = fileColumns[kind];
    if (columns.name) patch[columns.name] = file.fileName;
    if (columns.mime) patch[columns.mime] = file.mimeType;
    if (columns.base64) patch[columns.base64] = null;
    patch[columns.url] = file.url;
    patch[columns.path] = file.blobPath;
  }
  return patch;
}
