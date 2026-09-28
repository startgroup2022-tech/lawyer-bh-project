import { PDFDocument } from "pdf-lib";
import { FILE_KINDS, FILE_MAX_BYTES, TRAINING_STATUSES, TRAINING_TYPES, TrainingError, type FileKind, type ManifestFile, type TrainingFilters, type TrainingInput } from "./types";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TrainingError("invalid_input");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, field: string, required = true) {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new TrainingError(`invalid_${field}`);
  return value.trim();
}
function choice<T extends string>(value: unknown, choices: readonly T[], field: string): T {
  if (!choices.includes(value as T)) throw new TrainingError(`invalid_${field}`);
  return value as T;
}
export function parseApplication(value: unknown, now = new Date()): TrainingInput {
  const v = record(value);
  if (v.consent !== true || (v.website !== undefined && v.website !== "")) throw new TrainingError("invalid_consent");
  const type = choice(v.type, TRAINING_TYPES, "type");
  const email = text(v.email, 254, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new TrainingError("invalid_email");
  const phone = text(v.phone, 30, "phone");
  if (!/^\+[\d\s()-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15) throw new TrainingError("invalid_phone");
  const startDate = text(v.startDate, 10, "date");
  const day = new Date(`${startDate}T00:00:00Z`);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bahrain", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== startDate || startDate < today) throw new TrainingError("invalid_date");
  if (typeof v.durationWeeks !== "number" || !Number.isInteger(v.durationWeeks) || v.durationWeeks < 1 || v.durationWeeks > 52) throw new TrainingError("invalid_duration");
  return { type, field: type === "other" ? text(v.field, 300, "field") : "", fullName: text(v.fullName, 160, "fullName"), email, phone,
    location: text(v.location, 200, "location"), university: text(v.university ?? "", 300, "university", false), qualification: text(v.qualification, 300, "qualification"), specialization: text(v.specialization, 300, "specialization"),
    startDate, durationWeeks: v.durationWeeks, message: text(v.message ?? "", 4000, "message", false), consent: true };
}
export function fileKind(value: unknown): FileKind { return choice(value, FILE_KINDS, "files"); }
export function parseManifest(value: unknown): ManifestFile[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) throw new TrainingError("invalid_files");
  const result = value.map(item => {
    const f = record(item); const kind = fileKind(f.kind);
    if (typeof f.name !== "string" || f.name.length > 255 || !/\.pdf$/i.test(f.name) || !Number.isSafeInteger(f.size) || Number(f.size) < 12 || Number(f.size) > FILE_MAX_BYTES) throw new TrainingError("invalid_files");
    return { kind, name: f.name.replace(/[\x00-\x1f\x7f/\\]/g, "_"), size: Number(f.size) };
  });
  if (!result.some(f => f.kind === "cv") || new Set(result.map(f => f.kind)).size !== result.length) throw new TrainingError("invalid_files");
  return result;
}
export async function validatePdf(bytes: Buffer) {
  try {
    if (bytes.length < 12 || bytes.length > FILE_MAX_BYTES || !bytes.subarray(0, 8).toString().startsWith("%PDF-") || !bytes.subarray(-1024).toString().includes("%%EOF")) throw new Error();
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true });
    if (pdf.isEncrypted || pdf.getPageCount() < 1) throw new Error();
  } catch { throw new TrainingError("invalid_pdf"); }
}
export function parseReview(value: unknown): { version: number; action: "archive" | "restore" } | { version: number; status: typeof TRAINING_STATUSES[number]; notes: string } {
  const v = record(value);
  if (!Number.isSafeInteger(v.version) || Number(v.version) < 1) throw new TrainingError("invalid_version");
  const version = Number(v.version);
  if (v.action !== undefined) return { version, action: choice(v.action, ["archive", "restore"] as const, "action") };
  return { version, status: choice(v.status, TRAINING_STATUSES, "status"), notes: text(v.notes ?? "", 6000, "notes", false) };
}
export function parseFilters(value: unknown): TrainingFilters {
  const v = record(value); const page = Number(v.page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || (v.archived !== undefined && !["true", "false", true, false, ""].includes(v.archived as string))) throw new TrainingError("invalid_input");
  return { type: v.type ? choice(v.type, TRAINING_TYPES, "type") : "", status: v.status ? choice(v.status, TRAINING_STATUSES, "status") : "",
    query: text(v.query ?? "", 150, "query", false), page, archived: v.archived === true || v.archived === "true" };
}
