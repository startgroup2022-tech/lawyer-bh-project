import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sarayaInvitations, sarayaPropertyMemberships, sarayaUsers } from "@/lib/db/saraya-schema";
import { createActivationService } from "@/lib/saraya/auth/activation";
import { handle, jsonBody, text } from "@/lib/saraya/auth/http";
import { hashPassword } from "@/lib/saraya/auth/passwords";
import { requestIp } from "@/lib/saraya/auth/security";
import { authRateLimiter } from "@/lib/saraya/auth/store";

export async function POST(request: Request) {
  return handle(async () => {
    const body = await jsonBody(request);
    const token = text(body, "token");
    await authRateLimiter.check("activate", requestIp(request), token);
    const now = new Date();
    const service = createActivationService({
      hash: hashPassword,
      findValid: async (tokenHash) => {
        const [invite] = await db.select({ id: sarayaInvitations.id }).from(sarayaInvitations).where(and(eq(sarayaInvitations.tokenHash, tokenHash), isNull(sarayaInvitations.consumedAt), gt(sarayaInvitations.expiresAt, now))).limit(1);
        return invite ?? null;
      },
      commit: async (input) => db.transaction(async (tx) => {
        const [invite] = await tx.update(sarayaInvitations).set({ consumedAt: now, updatedAt: now }).where(and(eq(sarayaInvitations.id, input.invitationId), eq(sarayaInvitations.tokenHash, input.tokenHash), isNull(sarayaInvitations.consumedAt), gt(sarayaInvitations.expiresAt, now))).returning();
        if (!invite) return null;
        const identity = invite.normalizedEmail ? eq(sarayaUsers.normalizedEmail, invite.normalizedEmail) : eq(sarayaUsers.normalizedPhone, invite.normalizedPhone!);
        const [existing] = await tx.select({ id: sarayaUsers.id }).from(sarayaUsers).where(identity).limit(1);
        const [user] = existing ? await tx.update(sarayaUsers).set({ passwordHash: input.passwordHash, isActive: true, updatedAt: now }).where(eq(sarayaUsers.id, existing.id)).returning({ id: sarayaUsers.id }) : await tx.insert(sarayaUsers).values({ normalizedEmail: invite.normalizedEmail, normalizedPhone: invite.normalizedPhone, passwordHash: input.passwordHash, displayNameAr: input.displayNameAr, displayNameEn: input.displayNameEn }).returning({ id: sarayaUsers.id });
        await tx.insert(sarayaPropertyMemberships).values({ userId: user.id, propertyId: invite.propertyId, role: invite.role }).onConflictDoNothing();
        return user.id;
      }),
    });
    const userId = await service.activate({ token, password: text(body, "password"), displayNameAr: text(body, "displayNameAr"), displayNameEn: text(body, "displayNameEn") });
    return Response.json({ userId }, { status: 201 });
  });
}
