import { and, eq, ne, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { matchesCode } from "@/lib/client-auth/validation";
import { db, schema } from "@/lib/db/client";
import { getProviderSessionFromRequest } from "../../_session";

export async function POST(request: NextRequest) {
  const session = getProviderSessionFromRequest(request);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { challengeId?: unknown; code?: unknown };
  const challengeId = String(body.challengeId ?? "");
  const code = String(body.code ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code)) return NextResponse.json({ ok: false, error: "Invalid verification code", code: "EMAIL_CHANGE_CODE_INVALID" }, { status: 400 });
  const secret = process.env.CLIENT_AUTH_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Email verification unavailable" }, { status: 503 });
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM provider_email_change_challenges WHERE id = ${challengeId} FOR UPDATE`);
    const [challenge] = await tx.select().from(schema.providerEmailChangeChallenges).where(and(eq(schema.providerEmailChangeChallenges.id, challengeId), eq(schema.providerEmailChangeChallenges.providerId, session.providerId))).limit(1);
    if (!challenge || challenge.consumed || !challenge.delivered || challenge.attempts >= 5 || challenge.expiresAt.getTime() <= Date.now()) return { error: "EMAIL_CHANGE_CODE_INVALID" } as const;
    await tx.update(schema.providerEmailChangeChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(schema.providerEmailChangeChallenges.id, challengeId));
    if (!matchesCode(challengeId, code, challenge.codeDigest, secret)) return { error: "EMAIL_CHANGE_CODE_INVALID" } as const;
    const [duplicate] = await tx.select({ id: schema.bahrainLawyers.id }).from(schema.bahrainLawyers).where(and(eq(schema.bahrainLawyers.email, challenge.email), ne(schema.bahrainLawyers.id, session.providerId))).limit(1);
    if (duplicate) return { error: "EMAIL_ALREADY_USED" } as const;
    const [provider] = await tx.update(schema.bahrainLawyers).set({ email: challenge.email, updatedAt: new Date() }).where(and(eq(schema.bahrainLawyers.id, session.providerId), eq(schema.bahrainLawyers.countryCode, session.countryCode))).returning({ email: schema.bahrainLawyers.email });
    await tx.update(schema.providerEmailChangeChallenges).set({ consumed: true }).where(eq(schema.providerEmailChangeChallenges.id, challengeId));
    return { email: provider.email } as const;
  });
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error === "EMAIL_ALREADY_USED" ? "Email is already used" : "Invalid verification code", code: result.error }, { status: result.error === "EMAIL_ALREADY_USED" ? 409 : 400 });
  return NextResponse.json({ ok: true, email: result.email });
}
