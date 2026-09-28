import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { db, schema } from "@/lib/db/client";
import { buildApprovedProviderPatch, type ProposedProfileFiles } from "@/lib/provider/profile-change-review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPermission("manage_approvals");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM provider_profile_change_requests WHERE id = ${id} FOR UPDATE`);
      const [change] = await tx.select().from(schema.providerProfileChangeRequests).where(and(eq(schema.providerProfileChangeRequests.id, id), eq(schema.providerProfileChangeRequests.status, "pending"))).limit(1);
      if (!change) return null;
      const providerPatch = buildApprovedProviderPatch(change.proposedValues, change.proposedFiles as ProposedProfileFiles);
      await tx.update(schema.bahrainLawyers).set({ ...providerPatch, updatedAt: new Date() }).where(and(eq(schema.bahrainLawyers.id, change.providerId), eq(schema.bahrainLawyers.countryCode, change.countryCode)));
      const [reviewed] = await tx.update(schema.providerProfileChangeRequests).set({ status: "approved", reviewedBy: admin.id, reviewedAt: new Date(), rejectionReason: null, updatedAt: new Date() }).where(and(eq(schema.providerProfileChangeRequests.id, id), eq(schema.providerProfileChangeRequests.status, "pending"))).returning();
      return reviewed ?? null;
    });
    if (!result) return NextResponse.json({ ok: false, error: "Profile change is no longer pending", code: "PROFILE_CHANGE_CONFLICT" }, { status: 409 });
    return NextResponse.json({ ok: true, request: { id: result.id, status: result.status, reviewedAt: result.reviewedAt } });
  } catch (error) {
    console.error("[admin/profile-change/approve] failed", error);
    return NextResponse.json({ ok: false, error: "Could not approve profile change" }, { status: 500 });
  }
}
