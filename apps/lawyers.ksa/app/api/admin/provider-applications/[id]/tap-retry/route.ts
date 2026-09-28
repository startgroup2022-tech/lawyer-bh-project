import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/admin-session";
import { db, schema } from "@/lib/db/client";
import { getTapConfig } from "@/lib/tap/config";
import { runTapOnboarding } from "@/lib/tap/onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session || session.role === "reviewer") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const [activeAdmin] = await db.select({ id: schema.adminUsers.id }).from(schema.adminUsers).where(and(
    eq(schema.adminUsers.id, session.id),
    eq(schema.adminUsers.isActive, true),
  )).limit(1);
  if (!activeAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const config = getTapConfig();
  const [onboarding] = await db.select().from(schema.tapRetailerOnboarding).where(and(
    eq(schema.tapRetailerOnboarding.lawyerId, id),
    eq(schema.tapRetailerOnboarding.environment, config.mode),
  )).limit(1);

  if (!onboarding) return NextResponse.json({ ok: false, error: "Tap onboarding not found" }, { status: 404 });
  if (onboarding.stage !== "tap_failed") {
    return NextResponse.json({ ok: false, error: "Tap onboarding is not retryable", stage: onboarding.stage }, { status: 409 });
  }

  const result = await runTapOnboarding(id);
  const failed = result.stage === "tap_failed";
  return NextResponse.json({
    ok: !failed,
    stage: result.stage,
    payoutEnabled: result.payoutEnabled,
    error: failed ? "Tap onboarding request failed" : undefined,
  }, { status: failed ? 502 : 200 });
}
