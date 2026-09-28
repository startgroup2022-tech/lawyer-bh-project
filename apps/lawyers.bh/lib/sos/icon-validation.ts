const allowedTypes = new Set(["image/png", "image/svg+xml"]);
const maxIconBytes = 2 * 1024 * 1024;

export function validateSosCaseIcon(file: File) {
  if (!allowedTypes.has(file.type)) throw new Error("invalid_icon_type");
  if (file.size <= 0 || file.size > maxIconBytes) throw new Error("invalid_icon_size");
  return { extension: file.type === "image/svg+xml" ? "svg" : "png", contentType: file.type };
}
