import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sarayaPropertyMemberships, sarayaUsers } from "@/lib/db/saraya-schema";
import { ApiError, validatedEmail, validatedIdentity, validatedPhone } from "./contracts";
import { hashPassword, verifyPassword } from "./passwords";
import { createSessionService } from "./sessions";
import type { LoadedUser, SessionRepository } from "./sessions";
import { loadSarayaUser, sessionRepository } from "./store";

function secret() { const value = process.env.SARAYA_ACCESS_TOKEN_SECRET; if (!value) throw new ApiError(503, "AUTH_NOT_CONFIGURED", "خدمة الدخول غير مهيأة", "Authentication service is not configured"); return value; }
export function createSarayaSessions(dependencies: {
  sessions: SessionRepository;
  loadUser(id: string): Promise<LoadedUser | null>;
}) { return createSessionService({ ...dependencies, accessTokenSecret: secret() }); }
export function sessions() { return createSarayaSessions({ sessions: sessionRepository, loadUser: loadSarayaUser }); }
export async function login(identity: string, password: string) {
  const { email: normalizedEmail, phone: normalizedPhone } = validatedIdentity(identity);
  const identityCondition = normalizedEmail ? eq(sarayaUsers.normalizedEmail, normalizedEmail) : eq(sarayaUsers.normalizedPhone, normalizedPhone!);
  const [user] = await db.select().from(sarayaUsers).where(identityCondition).limit(1);
  if (!user?.isActive || !user.passwordHash || !await verifyPassword(password, user.passwordHash)) throw new ApiError(401, "INVALID_CREDENTIALS", "بيانات الدخول غير صحيحة", "Invalid credentials");
  return sessions().create(user.id);
}
export async function register(input: { displayNameAr: string; displayNameEn: string; email: string; phone: string; password: string }) {
  const displayNameAr = input.displayNameAr.trim();
  const displayNameEn = input.displayNameEn.trim();
  if (!displayNameAr || !displayNameEn) throw new ApiError(422, "INVALID_NAME", "الاسم مطلوب بالعربية والإنجليزية", "Arabic and English names are required");
  const normalizedEmail = validatedEmail(input.email);
  const normalizedPhone = validatedPhone(input.phone);
  const [existing] = await db.select({ id: sarayaUsers.id }).from(sarayaUsers).where(or(eq(sarayaUsers.normalizedEmail, normalizedEmail), eq(sarayaUsers.normalizedPhone, normalizedPhone))).limit(1);
  if (existing) throw new ApiError(409, "ACCOUNT_EXISTS", "يوجد حساب مسجل بهذه البيانات", "An account already exists with these details");
  const passwordHash = await hashPassword(input.password);
  try {
    const [user] = await db.insert(sarayaUsers).values({ normalizedEmail, normalizedPhone, passwordHash, displayNameAr, displayNameEn, isActive: true }).returning({ id: sarayaUsers.id });
    if (!user) throw new ApiError(500, "REGISTRATION_FAILED", "تعذر إنشاء الحساب", "Could not create account");
    return sessions().create(user.id);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") throw new ApiError(409, "ACCOUNT_EXISTS", "يوجد حساب مسجل بهذه البيانات", "An account already exists with these details");
    throw error;
  }
}
export async function addMembership(userId: string, propertyId: string, role: typeof sarayaPropertyMemberships.$inferInsert.role) { await db.insert(sarayaPropertyMemberships).values({ userId, propertyId, role }).onConflictDoNothing(); }
