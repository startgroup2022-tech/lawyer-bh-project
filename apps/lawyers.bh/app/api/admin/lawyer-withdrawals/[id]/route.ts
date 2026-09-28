import { NextResponse } from "next/server";

import { requireAdminPermission } from "@/lib/auth/admin-access";
import { LawyerWithdrawalError, transitionLawyerWithdrawal } from "@/lib/payments/lawyer-withdrawals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPermission("manage_finance");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const action = body.action;
  if (action !== "approved" && action !== "rejected" && action !== "paid") {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  try {
    const { id } = await params;
    const withdrawal = await transitionLawyerWithdrawal({
      withdrawalId: id,
      action,
      adminId: admin.id,
      settlementReference: String(body.settlementReference ?? ""),
    });
    return NextResponse.json({ ok: true, withdrawal });
  } catch (error) {
    if (error instanceof LawyerWithdrawalError) {
      const status = error.code === "not_found" ? 404 : error.code === "conflict" ? 409 : 400;
      return NextResponse.json({ ok: false, error: error.code }, { status });
    }
    console.error("[admin lawyer withdrawal] failed", error);
    return NextResponse.json({ ok: false, error: "Withdrawal update failed" }, { status: 500 });
  }
}
