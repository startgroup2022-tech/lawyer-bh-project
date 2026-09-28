import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPermission("manage_approvals");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const reason = String((await request.json().catch(() => ({})) as { reason?: unknown }).reason ?? "").trim();
  if (!reason) return NextResponse.json({ ok: false, error: "Rejection reason is required", code: "REJECTION_REASON_REQUIRED" }, { status: 400 });
  const { id } = await context.params;
  try {
    const reviewed = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM provider_profile_change_requests WHERE id = ${id} FOR UPDATE`);
      const [row] = await tx.update(schema.providerProfileChangeRequests).set({ status: "rejected", rejectionReason: reason.slice(0, 1000), reviewedBy: admin.id, reviewedAt: new Date(), updatedAt: new Date() }).where(and(eq(schema.providerProfileChangeRequests.id, id), eq(schema.providerProfileChangeRequests.status, "pending"))).returning();
      return row ?? null;
    });
    if (!reviewed) return NextResponse.json({ ok: false, error: "Profile change is no longer pending", code: "PROFILE_CHANGE_CONFLICT" }, { status: 409 });
    return NextResponse.json({ ok: true, request: { id: reviewed.id, status: reviewed.status, rejectionReason: reviewed.rejectionReason, reviewedAt: reviewed.reviewedAt } });
  } catch (error) {
    console.error("[admin/profile-change/reject] failed", error);
    return NextResponse.json({ ok: false, error: "Could not reject profile change" }, { status: 500 });
  }
}
