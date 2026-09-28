import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sarayaAuthRateLimits, sarayaContacts, sarayaInvitations, sarayaOwners, sarayaPropertyMemberships, sarayaRefreshSessions, sarayaUsers } from "@/lib/db/saraya-schema";
import type { InvitationRecord, InvitationRepository } from "./invitations";
import type { SessionRecord, SessionRepository } from "./sessions";
import { createRateLimiter } from "./security";
import { rateLimitTimestamp } from "./rate-limit-window";

export const invitationRepository: InvitationRepository = {
  async insert(record) { const [saved] = await db.insert(sarayaInvitations).values(record).returning(); return saved as InvitationRecord; },
  async findByTokenHash(tokenHash) { const [row] = await db.select().from(sarayaInvitations).where(eq(sarayaInvitations.tokenHash, tokenHash)).limit(1); return (row as InvitationRecord | undefined) ?? null; },
  async consume(id, consumedAt) { const rows = await db.update(sarayaInvitations).set({ consumedAt, updatedAt: consumedAt }).where(and(eq(sarayaInvitations.id, id), isNull(sarayaInvitations.consumedAt))).returning({ id: sarayaInvitations.id }); return rows.length === 1; },
};
type SarayaAuthDatabase = Pick<typeof db, "select" | "insert" | "update">;

export function createSessionRepository(database: SarayaAuthDatabase): SessionRepository {
  return {
  async insert(record) { await database.insert(sarayaRefreshSessions).values(record); },
  async findByRefreshHash(refreshTokenHash) { const [row] = await database.select().from(sarayaRefreshSessions).where(eq(sarayaRefreshSessions.refreshTokenHash, refreshTokenHash)).limit(1); return (row as SessionRecord | undefined) ?? null; },
  async findByPreviousRefreshHash(previousRefreshTokenHash) { const [row] = await database.select().from(sarayaRefreshSessions).where(eq(sarayaRefreshSessions.previousRefreshTokenHash, previousRefreshTokenHash)).limit(1); return (row as SessionRecord | undefined) ?? null; },
  async rotate(id, expectedHash, refreshTokenHash, rotatedAt, generation) { const rows = await database.update(sarayaRefreshSessions).set({ previousRefreshTokenHash: expectedHash, refreshTokenHash, rotatedAt, generation: generation + 1 }).where(and(eq(sarayaRefreshSessions.id, id), eq(sarayaRefreshSessions.refreshTokenHash, expectedHash), eq(sarayaRefreshSessions.generation, generation), isNull(sarayaRefreshSessions.revokedAt))).returning({ id: sarayaRefreshSessions.id }); return rows.length === 1; },
  async revoke(id, revokedAt) { await database.update(sarayaRefreshSessions).set({ revokedAt }).where(eq(sarayaRefreshSessions.id, id)); },
  async revokeFamily(familyId, revokedAt) { await database.update(sarayaRefreshSessions).set({ revokedAt }).where(and(eq(sarayaRefreshSessions.familyId, familyId), isNull(sarayaRefreshSessions.revokedAt))); },
  async findActiveById(id) { const [row] = await database.select().from(sarayaRefreshSessions).where(eq(sarayaRefreshSessions.id, id)).limit(1); return (row as SessionRecord | undefined) ?? null; },
  };
}

export const sessionRepository: SessionRepository = createSessionRepository(db);
const rateLimitStore = { async prune(before: Date) { await db.delete(sarayaAuthRateLimits).where(lt(sarayaAuthRateLimits.updatedAt, before)); }, async increment(bucket: string, now: Date, windowMs: number) { const cutoff = rateLimitTimestamp(new Date(now.getTime() - windowMs)); const current = rateLimitTimestamp(now); const rows = await db.insert(sarayaAuthRateLimits).values({ bucket, windowStartedAt: now, count: 1, updatedAt: now }).onConflictDoUpdate({ target: sarayaAuthRateLimits.bucket, set: { windowStartedAt: sql`CASE WHEN ${sarayaAuthRateLimits.windowStartedAt} <= ${cutoff}::timestamptz THEN ${current}::timestamptz ELSE ${sarayaAuthRateLimits.windowStartedAt} END`, count: sql`CASE WHEN ${sarayaAuthRateLimits.windowStartedAt} <= ${cutoff}::timestamptz THEN 1 ELSE ${sarayaAuthRateLimits.count} + 1 END`, updatedAt: now } }).returning({ count: sarayaAuthRateLimits.count }); return rows[0]?.count ?? 1; } };
export const authRateLimiter = createRateLimiter({ store: rateLimitStore, limit: 10, windowMs: 15 * 60_000 });
export async function loadSarayaUserFrom(database: Pick<typeof db, "select">, id: string) {
  const [user] = await database.select({ id: sarayaUsers.id, isActive: sarayaUsers.isActive }).from(sarayaUsers).where(eq(sarayaUsers.id, id)).limit(1);
  if (!user) return null;
  const memberships = await database.select({ propertyId: sarayaPropertyMemberships.propertyId, role: sarayaPropertyMemberships.role, isActive: sarayaPropertyMemberships.isActive }).from(sarayaPropertyMemberships).where(eq(sarayaPropertyMemberships.userId, id));
  const contacts = await database.select({ propertyId: sarayaContacts.propertyId, tenantId: sarayaContacts.tenantOrganizationId }).from(sarayaContacts).where(eq(sarayaContacts.userId, id));
  const owners = await database.select({ propertyId: sarayaOwners.propertyId, ownerId: sarayaOwners.id }).from(sarayaOwners).where(eq(sarayaOwners.userId, id));
  return { ...user, memberships: memberships.map((membership) => ({ ...membership, tenantId: contacts.find((c) => c.propertyId === membership.propertyId)?.tenantId, ownerId: owners.find((o) => o.propertyId === membership.propertyId)?.ownerId })) };
}
export const loadSarayaUser = (id: string) => loadSarayaUserFrom(db, id);
