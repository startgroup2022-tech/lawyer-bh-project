import type { SarayaRole } from "@/lib/db/saraya-schema";

export type SarayaPermission = "units:read" | "units:write" | "tenants:read" | "tenants:write" | "tenant:self:read" | "owner:self:read" | "billing:read" | "billing:write" | "maintenance:read" | "maintenance:write" | "memberships:write";
export interface SarayaMembership { propertyId: string; role: SarayaRole; tenantId?: string | null; ownerId?: string | null }
export interface SarayaPrincipal { userId: string; propertyIds: string[]; memberships: SarayaMembership[]; sessionId: string }

export class ApiError extends Error {
  readonly name = "ApiError";
  constructor(public readonly status: number, public readonly code: string, public readonly messageAr: string, public readonly messageEn: string, public readonly fieldErrors?: Record<string, string[]>) { super(code); }
}
export const normalizeEmail = (value: string) => value.trim().toLocaleLowerCase("en-US");
export const normalizePhone = (value: string) => (value.trim().startsWith("+") ? "+" : "") + value.replace(/\D/g, "");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const e164Pattern = /^\+[1-9]\d{7,14}$/;
export function validatedEmail(value: string): string {
  const normalized = normalizeEmail(value);
  if (!emailPattern.test(normalized) || normalized.length > 254) throw new ApiError(422, "INVALID_EMAIL", "صيغة البريد الإلكتروني غير صحيحة", "Invalid email address", { email: ["invalid"] });
  return normalized;
}
export function validatedPhone(value: string): string {
  const normalized = normalizePhone(value);
  if (!e164Pattern.test(normalized)) throw new ApiError(422, "INVALID_PHONE", "رقم الهاتف يجب أن يكون بالصيغة الدولية", "Phone must use E.164 international format", { phone: ["invalid"] });
  return normalized;
}
export function validatedIdentity(value: string): { email: string | null; phone: string | null } {
  return value.includes("@") ? { email: validatedEmail(value), phone: null } : { email: null, phone: validatedPhone(value) };
}
export function apiErrorResponse(error: unknown): Response {
  const value = error instanceof ApiError ? error : new ApiError(500, "INTERNAL_ERROR", "حدث خطأ غير متوقع", "An unexpected error occurred");
  return Response.json({ error: { code: value.code, messageAr: value.messageAr, messageEn: value.messageEn, ...(value.fieldErrors ? { fieldErrors: value.fieldErrors } : {}) } }, { status: value.status });
}
