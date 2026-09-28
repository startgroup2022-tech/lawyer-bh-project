export type UploadWorkflow = "join" | "complete" | "import";
export type UploadItem = {
  field: string;
  name: string;
  type: string;
  size: number;
};
const documentFields = [
  "licenseFile",
  "institutionLicenseFile",
  "ibanCertificateFile",
  "personalIdFile",
];
const mimeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
export function parseManifest(workflow: unknown, value: unknown): UploadItem[] {
  if (
    !["join", "complete", "import"].includes(String(workflow)) ||
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > (workflow === "import" ? 1 : 5)
  )
    throw new Error("invalid_upload");
  const seen = new Set<string>();
  return value.map((item: UploadItem) => {
    if (
      !item ||
      typeof item.field !== "string" ||
      seen.has(item.field) ||
      typeof item.name !== "string" ||
      !item.name ||
      item.name.length > 200 ||
      /[\x00-\x1f\x7f/\\]/.test(item.name) ||
      typeof item.type !== "string"
    )
      throw new Error("invalid_upload");
    seen.add(item.field);
    const portrait = item.field === "profileImage";
    if (
      workflow === "import"
        ? item.field !== "file"
        : !portrait && !documentFields.includes(item.field)
    )
      throw new Error("invalid_upload");
    if (
      !Number.isSafeInteger(item.size) ||
      item.size < 1 ||
      item.size > (portrait ? 3 : 5) * 1024 * 1024
    )
      throw new Error("invalid_upload_size");
    const inferred = mimeByExtension[item.name.split(".").pop()!.toLowerCase()];
    const type =
      !item.type || item.type === "application/octet-stream"
        ? inferred
        : item.type === "image/jpg"
          ? "image/jpeg"
          : item.type;
    const allowed =
      workflow === "import"
        ? [mimeByExtension.xlsx]
        : portrait
          ? Object.values(mimeByExtension).filter((t) => t.startsWith("image/"))
          : [
              "application/pdf",
              "image/png",
              "image/jpeg",
              ...(item.field === "personalIdFile" ? ["image/webp"] : []),
            ];
    if (
      !type ||
      !allowed.includes(type) ||
      (workflow === "import" && inferred !== mimeByExtension.xlsx)
    )
      throw new Error("invalid_upload_type");
    return { field: item.field, name: item.name, type, size: item.size };
  });
}
