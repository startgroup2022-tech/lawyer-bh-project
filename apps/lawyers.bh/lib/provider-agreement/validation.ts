import { AgreementError } from "./model";
export function signingVersion(value: unknown, current: { id: string } | null) {
  if (value !== (current?.id ?? "legacy"))
    throw new AgreementError("agreement_version_stale", 409);
  return current?.id ?? null;
}
export function previewSignature(value: unknown): string {
  if (value == null || value === "") return "";
  if (
    typeof value !== "string" ||
    value.length > 275000 ||
    !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  )
    throw new AgreementError("invalid_signature");
  const bytes = Buffer.from(value.split(",")[1], "base64");
  if (
    bytes.length > 200 * 1024 ||
    bytes.length < 24 ||
    bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
    bytes.readUInt32BE(16) > 2000 ||
    bytes.readUInt32BE(20) > 1000
  )
    throw new AgreementError("invalid_signature");
  return value;
}
