import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  sarayaPropertyMemberships,
  sarayaProperties,
  sarayaRefreshSessions,
  sarayaUsers,
} from "@/lib/db/saraya-schema";
import { ApiError } from "../auth/contracts";
import { hashPassword, verifyPassword } from "../auth/passwords";
import { createAccountService, type AccountRecord } from "./account";
import { translateAccountPersistenceError } from "./persistence-errors";

async function findAccount(userId: string): Promise<AccountRecord | null> {
  const [user] = await db
    .select({
      id: sarayaUsers.id,
      displayNameAr: sarayaUsers.displayNameAr,
      displayNameEn: sarayaUsers.displayNameEn,
      email: sarayaUsers.normalizedEmail,
      phone: sarayaUsers.normalizedPhone,
      passwordHash: sarayaUsers.passwordHash,
    })
    .from(sarayaUsers)
    .where(eq(sarayaUsers.id, userId))
    .limit(1);
  if (!user) return null;
  const memberships = await db
    .select({
      propertyId: sarayaPropertyMemberships.propertyId,
      propertyNameAr: sarayaProperties.nameAr,
      propertyNameEn: sarayaProperties.nameEn,
      role: sarayaPropertyMemberships.role,
    })
    .from(sarayaPropertyMemberships)
    .innerJoin(
      sarayaProperties,
      eq(sarayaProperties.id, sarayaPropertyMemberships.propertyId),
    )
    .where(
      and(
        eq(sarayaPropertyMemberships.userId, userId),
        eq(sarayaPropertyMemberships.isActive, true),
      ),
    );
  return { ...user, memberships };
}

export function accountService() {
  return createAccountService({
    find: findAccount,
    async update(userId, input) {
      try {
        await db
          .update(sarayaUsers)
          .set({
            displayNameAr: input.displayNameAr,
            displayNameEn: input.displayNameEn,
            normalizedEmail: input.email,
            normalizedPhone: input.phone,
            updatedAt: new Date(),
          })
          .where(eq(sarayaUsers.id, userId));
      } catch (error) {
        translateAccountPersistenceError(error);
      }
      const updated = await findAccount(userId);
      if (!updated) {
        throw new ApiError(
          404,
          "ACCOUNT_NOT_FOUND",
          "الحساب غير موجود",
          "Account not found",
        );
      }
      return updated;
    },
    verify: verifyPassword,
    hash: hashPassword,
    async changePasswordAndRevokeOthers(userId, currentSessionId, passwordHash) {
      await db.transaction(async (tx) => {
        await tx
          .update(sarayaUsers)
          .set({ passwordHash, updatedAt: new Date() })
          .where(eq(sarayaUsers.id, userId));
        await tx
          .update(sarayaRefreshSessions)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(sarayaRefreshSessions.userId, userId),
              ne(sarayaRefreshSessions.id, currentSessionId),
              isNull(sarayaRefreshSessions.revokedAt),
            ),
          );
      });
    },
  });
}
