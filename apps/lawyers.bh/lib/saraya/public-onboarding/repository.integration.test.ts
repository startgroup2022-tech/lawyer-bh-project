import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/saraya-schema";
import { createSessionService, type SessionRecord } from "../auth/sessions";
import type {
  PublicOnboardingAtomicSessionContext,
  PublicOnboardingRepository,
} from "./contracts";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/db/client", () => ({ db: state.db }));

const configuredUrl = process.env.DATABASE_URL;
const localUrl = (() => {
  if (!configuredUrl) return null;
  const parsed = new URL(configuredUrl);
  return ["127.0.0.1", "localhost"].includes(parsed.hostname) ? configuredUrl : null;
})();

const accessTokenSecret = "integration-access-token-secret-32-characters";
const digest = "a".repeat(64);

function scopedMigration(path: string, schemaName: string) {
  return readFileSync(path, "utf8")
    .replace(/^BEGIN;$/gm, "")
    .replace(/^COMMIT;$/gm, "")
    .replaceAll("public.", `"${schemaName}".`);
}

function migrationBody(path: string) {
  return readFileSync(path, "utf8")
    .replace(/^BEGIN;$/gm, "")
    .replace(/^COMMIT;$/gm, "")
    .replace(/^SET LOCAL lock_timeout = '5s';$/gm, "");
}

function scopedVerifyMigration(path: string, schemaName: string) {
  return readFileSync(path, "utf8")
    .replaceAll("public.", `${schemaName}.`)
    .replaceAll("'public'", `'${schemaName}'`);
}

function checkoutAuthAlter() {
  const migration = readFileSync("drizzle/0122_saraya_public_rental_checkout.sql", "utf8");
  const start = migration.indexOf('ALTER TABLE "saraya_auth_challenges"');
  const end = migration.indexOf(";", start) + 1;
  if (start < 0 || end <= start) throw new Error("0121 auth challenge alteration is missing");
  return migration.slice(start, end);
}

function atomicSession(
  userId: string,
  context: PublicOnboardingAtomicSessionContext,
) {
  return createSessionService({
    sessions: context.sessions,
    loadUser: context.loadUser,
    accessTokenSecret,
    generateToken: () => randomUUID(),
  }).create(userId);
}

describe.skipIf(!localUrl)("Saraya public onboarding repository", () => {
  let admin: ReturnType<typeof postgres>;
  let sql: ReturnType<typeof postgres>;
  let repository: PublicOnboardingRepository;
  const schemaName = `saraya_onboarding_${randomUUID().replaceAll("-", "")}`;

  beforeAll(async () => {
    admin = postgres(localUrl!, { max: 1, onnotice: () => {} });
    await admin`CREATE SCHEMA ${admin(schemaName)}`;
    sql = postgres(localUrl!, {
      max: 8,
      connection: { search_path: schemaName },
      onnotice: () => {},
    });
    await sql.unsafe(scopedMigration("drizzle/0062_saraya_core.sql", schemaName));
    await sql.unsafe(scopedMigration("drizzle/0063_saraya_auth.sql", schemaName));
    await sql.unsafe(checkoutAuthAlter());
    await sql.unsafe(migrationBody("drizzle/0123_saraya_public_onboarding_audit.sql"));
    await sql.unsafe(scopedVerifyMigration(
      "drizzle/verify_0123_saraya_public_onboarding_audit.sql",
      schemaName,
    ));
    state.db = drizzle(sql, { schema });
    repository = (await import("./repository")).publicOnboardingRepository;
  });

  afterAll(async () => {
    await sql?.end();
    if (admin) {
      await admin`DROP SCHEMA IF EXISTS ${admin(schemaName)} CASCADE`;
      await admin.end();
    }
  });

  async function challenge(options: {
    challengeId?: string;
    email?: string;
    tokenDigest?: string;
  } = {}) {
    const challengeId = options.challengeId ?? randomUUID();
    await repository.createChallenge({
      challengeId,
      channel: "email",
      normalizedEmail: options.email ?? "tenant@example.com",
      normalizedPhone: null,
      tokenDigest: options.tokenDigest ?? digest,
      expiresAt: new Date("2030-01-01T00:10:00.000Z"),
      createdAt: new Date("2030-01-01T00:00:00.000Z"),
      context: { ip: "203.0.113.42", userAgent: "Browser\nTest" },
    });
    return challengeId;
  }

  function verifyInput(challengeId: string, overrides: Record<string, unknown> = {}) {
    return {
      challengeId,
      candidateDigest: digest,
      displayNameAr: "مستأجر",
      displayNameEn: "Tenant",
      now: new Date("2030-01-01T00:01:00.000Z"),
      context: { ip: "203.0.113.42", userAgent: "Browser\nTest" },
      createPasswordHash: vi.fn(async () => "unexposed-password-hash"),
      createSession: atomicSession,
      ...overrides,
    };
  }

  it("allows exactly one winner and atomically persists the account, session, consumption, and audit", async () => {
    const challengeId = await challenge();
    const results = await Promise.all([
      repository.verifyAndCreateSession(verifyInput(challengeId)),
      repository.verifyAndCreateSession(verifyInput(challengeId)),
    ]);

    expect(results.filter((result) => result.status === "verified")).toHaveLength(1);
    expect(results.filter((result) => result.status === "consumed")).toHaveLength(1);
    expect(await sql`SELECT count(*)::int AS count FROM saraya_users`).toEqual([{ count: 1 }]);
    expect(await sql`SELECT count(*)::int AS count FROM saraya_refresh_sessions`).toEqual([{ count: 1 }]);
    expect(await sql`SELECT count(*)::int AS count FROM saraya_auth_challenges WHERE consumed_at IS NOT NULL`).toEqual([{ count: 1 }]);
    expect(await sql`SELECT count(*)::int AS count FROM saraya_auth_audit_logs WHERE event='verify.succeeded'`).toEqual([{ count: 1 }]);
  });

  it("serializes account creation by identity so concurrent challenges hash only once", async () => {
    const firstChallenge = await challenge({
      email: "concurrent@example.com",
      tokenDigest: "2".repeat(64),
    });
    const secondChallenge = await challenge({
      email: "concurrent@example.com",
      tokenDigest: "3".repeat(64),
    });
    const firstHash = vi.fn(async () => "first-password-hash");
    const secondHash = vi.fn(async () => "second-password-hash");

    const results = await Promise.all([
      repository.verifyAndCreateSession(verifyInput(firstChallenge, {
        candidateDigest: "2".repeat(64),
        createPasswordHash: firstHash,
      })),
      repository.verifyAndCreateSession(verifyInput(secondChallenge, {
        candidateDigest: "3".repeat(64),
        createPasswordHash: secondHash,
      })),
    ]);

    expect(results.every((result) => result.status === "verified")).toBe(true);
    expect(firstHash.mock.calls.length + secondHash.mock.calls.length).toBe(1);
    expect(await sql`SELECT count(*)::int AS count FROM saraya_users WHERE normalized_email='concurrent@example.com'`).toEqual([{ count: 1 }]);
  });

  it("rolls back account and session creation and leaves the OTP retryable when session creation fails", async () => {
    const challengeId = await challenge({ email: "retry@example.com", tokenDigest: "b".repeat(64) });
    const failingSession = async (
      userId: string,
      context: PublicOnboardingAtomicSessionContext,
    ) => {
      const record: SessionRecord = {
        id: randomUUID(),
        familyId: randomUUID(),
        generation: 0,
        userId,
        refreshTokenHash: "failing-session-hash",
        previousRefreshTokenHash: null,
        expiresAt: new Date("2030-02-01T00:00:00.000Z"),
        revokedAt: null,
      };
      await context.sessions.insert(record);
      throw new Error("session_creation_failed");
    };
    const input = verifyInput(challengeId, {
      candidateDigest: "b".repeat(64),
      createSession: failingSession,
    });

    await expect(repository.verifyAndCreateSession(input)).rejects.toThrow("session_creation_failed");
    expect(await sql`SELECT count(*)::int AS count FROM saraya_users WHERE normalized_email='retry@example.com'`).toEqual([{ count: 0 }]);
    expect(await sql`SELECT count(*)::int AS count FROM saraya_refresh_sessions WHERE refresh_token_hash='failing-session-hash'`).toEqual([{ count: 0 }]);
    expect(await sql`SELECT consumed_at FROM saraya_auth_challenges WHERE id=${challengeId}`).toEqual([{ consumed_at: null }]);
    expect(await sql`SELECT count(*)::int AS count FROM saraya_auth_audit_logs WHERE challenge_id=${challengeId} AND reason='internal_error'`).toEqual([{ count: 1 }]);

    const retried = await repository.verifyAndCreateSession(verifyInput(challengeId, {
      candidateDigest: "b".repeat(64),
    }));
    expect(retried.status).toBe("verified");
  });

  it("rejects a disabled existing account generically without reactivation, duplication, hashing, or consumption", async () => {
    const challengeId = await challenge({ email: "disabled@example.com", tokenDigest: "c".repeat(64) });
    const [disabled] = await sql`
      INSERT INTO saraya_users(normalized_email, display_name_ar, display_name_en, is_active)
      VALUES ('disabled@example.com', 'معطل', 'Disabled', false)
      RETURNING id
    `;
    const input = verifyInput(challengeId, { candidateDigest: "c".repeat(64) });

    const result = await repository.verifyAndCreateSession(input);

    expect(result).toEqual({ status: "disabled" });
    expect(input.createPasswordHash).not.toHaveBeenCalled();
    expect(await sql`SELECT id, is_active FROM saraya_users WHERE normalized_email='disabled@example.com'`).toEqual([{ id: disabled.id, is_active: false }]);
    expect(await sql`SELECT consumed_at FROM saraya_auth_challenges WHERE id=${challengeId}`).toEqual([{ consumed_at: null }]);
    expect(await sql`SELECT count(*)::int AS count FROM saraya_refresh_sessions WHERE user_id=${disabled.id}`).toEqual([{ count: 0 }]);
  });

  it("does not hash credentials for invalid OTPs and writes a privacy-safe failure audit", async () => {
    const challengeId = await challenge({ email: "invalid@example.com", tokenDigest: "d".repeat(64) });
    const input = verifyInput(challengeId, { candidateDigest: "e".repeat(64) });

    expect(await repository.verifyAndCreateSession(input)).toEqual({ status: "invalid" });
    expect(input.createPasswordHash).not.toHaveBeenCalled();
    const [audit] = await sql`
      SELECT event, outcome, reason, ip_address, user_agent, metadata
      FROM saraya_auth_audit_logs
      WHERE challenge_id=${challengeId} AND event='verify.failed'
    `;
    expect(audit).toMatchObject({
      event: "verify.failed",
      outcome: "failed",
      reason: "invalid",
      ip_address: "203.0.113.0/24",
      user_agent: "Browser Test",
      metadata: {},
    });
    expect(JSON.stringify(audit)).not.toContain("invalid@example.com");
    expect(JSON.stringify(audit)).not.toContain("482193");
  });

  it("returns invalid for an unknown valid UUID and audits without a fabricated challenge reference", async () => {
    const unknownChallengeId = "99999999-9999-4999-8999-999999999999";

    const result = await repository.verifyAndCreateSession(verifyInput(unknownChallengeId));

    expect(result).toEqual({ status: "invalid" });
    const [audit] = await sql`
      SELECT challenge_id, event, outcome, reason
      FROM saraya_auth_audit_logs
      WHERE challenge_id IS NULL AND event='verify.failed' AND reason='invalid'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    expect(audit).toEqual({
      challenge_id: null,
      event: "verify.failed",
      outcome: "failed",
      reason: "invalid",
    });
  });

  it("stores challenge request audit context without identity or OTP data", async () => {
    const challengeId = await challenge({ email: "private@example.com", tokenDigest: "f".repeat(64) });
    const [audit] = await sql`
      SELECT event, outcome, reason, ip_address, user_agent, metadata
      FROM saraya_auth_audit_logs
      WHERE challenge_id=${challengeId} AND event='challenge.requested'
    `;

    expect(audit).toMatchObject({
      event: "challenge.requested",
      outcome: "accepted",
      reason: null,
      ip_address: "203.0.113.0/24",
      user_agent: "Browser Test",
      metadata: {},
    });
    expect(JSON.stringify(audit)).not.toContain("private@example.com");
    expect(JSON.stringify(audit)).not.toContain("f".repeat(64));
  });

  it("fails closed and rolls back auth state when critical audit persistence fails", async () => {
    const challengeId = await challenge({ email: "audit-failure@example.com", tokenDigest: "1".repeat(64) });
    const [sessionsBefore] = await sql`SELECT count(*)::int AS count FROM saraya_refresh_sessions`;
    await sql`ALTER TABLE saraya_auth_audit_logs RENAME TO saraya_auth_audit_logs_unavailable`;
    try {
      await expect(repository.verifyAndCreateSession(verifyInput(challengeId, {
        candidateDigest: "1".repeat(64),
      }))).rejects.toThrow();
      expect(await sql`SELECT count(*)::int AS count FROM saraya_users WHERE normalized_email='audit-failure@example.com'`).toEqual([{ count: 0 }]);
      expect(await sql`SELECT count(*)::int AS count FROM saraya_refresh_sessions`).toEqual([{ count: sessionsBefore.count }]);
      expect(await sql`SELECT consumed_at FROM saraya_auth_challenges WHERE id=${challengeId}`).toEqual([{ consumed_at: null }]);
    } finally {
      await sql`ALTER TABLE saraya_auth_audit_logs_unavailable RENAME TO saraya_auth_audit_logs`;
    }
  });
});
