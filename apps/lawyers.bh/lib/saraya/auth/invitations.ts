import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { SarayaRole } from "@/lib/db/saraya-schema";
import { ApiError, validatedEmail, validatedPhone } from "./contracts";
export interface InvitationRecord { id: string; propertyId: string; role: SarayaRole; normalizedEmail: string | null; normalizedPhone: string | null; tokenHash: string; expiresAt: Date; consumedAt: Date | null; invitedByUserId?: string | null }
export interface InvitationRepository { insert(record: InvitationRecord): Promise<InvitationRecord>; findByTokenHash(hash: string): Promise<InvitationRecord | null>; consume(id: string, consumedAt: Date): Promise<boolean> }
export const hashOpaqueToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function createInvitationService(deps: { invitations: InvitationRepository; mailer: { sendInvitation(message: { email?: string; phone?: string; token: string; expiresAt: Date }): Promise<void> }; now?: () => Date; generateToken?: () => string }) {
  const now = deps.now ?? (() => new Date()); const generate = deps.generateToken ?? (() => randomBytes(32).toString("base64url"));
  return {
    async create(input: { id?: string; propertyId: string; role: SarayaRole; email?: string; phone?: string; invitedByUserId?: string; expiresInMs?: number }) {
      if (!input.email && !input.phone) throw new ApiError(422, "IDENTITY_REQUIRED", "البريد أو الهاتف مطلوب", "Email or phone is required");
      const token = generate(); const record: InvitationRecord = { id: input.id ?? randomUUID(), propertyId: input.propertyId, role: input.role, normalizedEmail: input.email ? validatedEmail(input.email) : null, normalizedPhone: input.phone ? validatedPhone(input.phone) : null, tokenHash: hashOpaqueToken(token), expiresAt: new Date(now().getTime() + (input.expiresInMs ?? 172_800_000)), consumedAt: null, invitedByUserId: input.invitedByUserId ?? null };
      const saved = await deps.invitations.insert(record); await deps.mailer.sendInvitation({ ...(input.email ? { email: input.email.trim() } : {}), ...(input.phone ? { phone: input.phone.trim() } : {}), token, expiresAt: saved.expiresAt }); return saved;
    },
    async consume(token: string) { const record = await deps.invitations.findByTokenHash(hashOpaqueToken(token)); if (!record) throw new ApiError(404, "INVITATION_INVALID", "الدعوة غير صالحة", "Invitation is invalid"); if (record.consumedAt) throw new ApiError(409, "INVITATION_USED", "تم استخدام الدعوة", "Invitation has already been used"); if (record.expiresAt <= now()) throw new ApiError(410, "INVITATION_EXPIRED", "انتهت صلاحية الدعوة", "Invitation has expired"); if (!await deps.invitations.consume(record.id, now())) throw new ApiError(409, "INVITATION_USED", "تم استخدام الدعوة", "Invitation has already been used"); return record; },
  };
}
