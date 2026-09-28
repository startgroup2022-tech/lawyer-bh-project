import { describe, expect, it } from "vitest";

import { createInvitationService, type InvitationRecord } from "./invitations";
import { hashPassword, verifyPassword } from "./passwords";
import { createSessionService, type SessionRecord } from "./sessions";
import { validatedEmail, validatedPhone } from "./contracts";

const now = new Date("2026-09-06T10:00:00.000Z");

describe("Saraya authentication", () => {
  it("rejects malformed email and phone identities", () => {
    expect(() => validatedEmail("not-an-email")).toThrowError(/INVALID_EMAIL/);
    expect(() => validatedPhone("abc")).toThrowError(/INVALID_PHONE/);
    expect(() => validatedPhone("97312345678")).toThrowError(/INVALID_PHONE/);
    expect(validatedEmail(" User@Example.COM ")).toBe("user@example.com");
    expect(validatedPhone("+973 1234 5678")).toBe("+97312345678");
  });
  it("hashes passwords with bcrypt", async () => {
    const hash = await hashPassword("A secure passphrase 123!");
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toContain("A secure passphrase 123!");
    await expect(verifyPassword("A secure passphrase 123!", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("creates expiring single-use invitations using only a token digest", async () => {
    const invitations: InvitationRecord[] = [];
    const sent: Array<{ email?: string; phone?: string; token: string; expiresAt: Date }> = [];
    const service = createInvitationService({
      now: () => now, generateToken: () => "raw-invitation-token",
      invitations: {
        insert: async (record) => (invitations.push(record), record),
        findByTokenHash: async (hash) => invitations.find((item) => item.tokenHash === hash) ?? null,
        consume: async (id, consumedAt) => {
          const item = invitations.find((candidate) => candidate.id === id);
          if (!item || item.consumedAt) return false;
          item.consumedAt = consumedAt; return true;
        },
      }, mailer: { sendInvitation: async (message) => void sent.push(message) },
    });
    const invitation = await service.create({ id: "invite-1", propertyId: "property-1", role: "tenant", email: " Tenant@Example.COM ", expiresInMs: 60_000 });
    expect(invitations[0].normalizedEmail).toBe("tenant@example.com");
    expect(invitations[0].tokenHash).not.toBe("raw-invitation-token");
    expect(sent[0].token).toBe("raw-invitation-token");
    expect(invitation.expiresAt.toISOString()).toBe("2026-09-06T10:01:00.000Z");
    await expect(service.consume("raw-invitation-token")).resolves.toMatchObject({ id: "invite-1" });
    await expect(service.consume("raw-invitation-token")).rejects.toMatchObject({ code: "INVITATION_USED" });
  });

  it("rejects expired invitations", async () => {
    const service = createInvitationService({
      now: () => now, generateToken: () => "unused",
      invitations: {
        insert: async (record) => record,
        findByTokenHash: async () => ({ id: "old", propertyId: "p", role: "tenant", normalizedEmail: "a@b.com", normalizedPhone: null, tokenHash: "ignored", expiresAt: new Date(now.getTime() - 1), consumedAt: null }),
        consume: async () => true,
      }, mailer: { sendInvitation: async () => undefined },
    });
    await expect(service.consume("token")).rejects.toMatchObject({ code: "INVITATION_EXPIRED" });
  });

  it("rotates refresh tokens, stores only hashes, and rejects replay", async () => {
    const sessions = new Map<string, SessionRecord>();
    const service = createSessionService({
      now: () => now, generateToken: (() => { let i = 0; return () => `token-${++i}`; })(),
      sessions: {
        insert: async (session) => void sessions.set(session.id, session),
        findByRefreshHash: async (hash) => [...sessions.values()].find((s) => s.refreshTokenHash === hash) ?? null,
        rotate: async (id, expected, next, at, generation) => { const s = sessions.get(id); if (!s || s.refreshTokenHash !== expected || s.revokedAt || s.generation !== generation) return false; s.previousRefreshTokenHash = expected; s.refreshTokenHash = next; s.generation++; s.rotatedAt = at; return true; },
        revoke: async (id, at) => { const s = sessions.get(id); if (s) s.revokedAt = at; },
        findByPreviousRefreshHash: async (hash) => [...sessions.values()].find((s) => s.previousRefreshTokenHash === hash) ?? null,
        revokeFamily: async (familyId, at) => { for (const s of sessions.values()) if (s.familyId === familyId) s.revokedAt = at; },
      }, accessTokenSecret: "test-secret-that-is-at-least-32-bytes-long",
      loadUser: async () => ({ id: "user-1", isActive: true, memberships: [{ propertyId: "p1", role: "tenant", tenantId: "t1", isActive: true }] }),
    });
    const created = await service.create("user-1", "session-1");
    expect([...sessions.values()][0].refreshTokenHash).not.toBe(created.refreshToken);
    const rotated = await service.refresh(created.refreshToken);
    expect(rotated.refreshToken).not.toBe(created.refreshToken);
    await expect(service.refresh(created.refreshToken)).rejects.toMatchObject({ code: "REFRESH_REUSE_DETECTED" });
    expect([...sessions.values()][0].revokedAt).toEqual(now);
  });
  it("allows only one concurrent refresh and revokes the family after the loser", async () => {
    const sessions = new Map<string, SessionRecord>();
    const service = createSessionService({
      now: () => now,
      generateToken: (() => { let i = 0; return () => `concurrent-token-${++i}`; })(),
      sessions: {
        insert: async (session) => void sessions.set(session.id, session),
        findByRefreshHash: async (hash) => [...sessions.values()].find((s) => s.refreshTokenHash === hash) ?? null,
        findByPreviousRefreshHash: async (hash) => [...sessions.values()].find((s) => s.previousRefreshTokenHash === hash) ?? null,
        rotate: async (id, expected, next, at, generation) => { await Promise.resolve(); const s = sessions.get(id); if (!s || s.refreshTokenHash !== expected || s.revokedAt || s.generation !== generation) return false; s.previousRefreshTokenHash = expected; s.refreshTokenHash = next; s.generation += 1; s.rotatedAt = at; return true; },
        revoke: async (id, at) => { const s = sessions.get(id); if (s) s.revokedAt = at; },
        revokeFamily: async (familyId, at) => { for (const s of sessions.values()) if (s.familyId === familyId) s.revokedAt = at; },
        findActiveById: async (id) => sessions.get(id) ?? null,
      },
      accessTokenSecret: "test-secret-that-is-at-least-32-bytes-long",
      loadUser: async () => ({ id: "user-1", isActive: true, memberships: [{ propertyId: "p1", role: "tenant", tenantId: "t1", isActive: true }] }),
    });
    const created = await service.create("user-1", "concurrent-session");
    const attempts = await Promise.allSettled([service.refresh(created.refreshToken), service.refresh(created.refreshToken)]);
    expect(attempts.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((item) => item.status === "rejected")).toHaveLength(1);
    expect(sessions.get("concurrent-session")?.revokedAt).toEqual(now);
    const winner = attempts.find((item): item is PromiseFulfilledResult<{ accessToken: string; refreshToken: string }> => item.status === "fulfilled");
    await expect(service.verifyAccess(winner!.value.accessToken)).rejects.toMatchObject({ code: "SESSION_REVOKED" });
  });
  it("persists the invitation actor", async () => { let saved: InvitationRecord | undefined; const service = createInvitationService({ invitations: { insert: async (record) => (saved = record), findByTokenHash: async () => null, consume: async () => false }, mailer: { sendInvitation: async () => undefined }, generateToken: () => "token", now: () => now }); await service.create({ propertyId: "p1", role: "tenant", email: "a@b.com", invitedByUserId: "admin-1" }); expect(saved?.invitedByUserId).toBe("admin-1"); });
});
