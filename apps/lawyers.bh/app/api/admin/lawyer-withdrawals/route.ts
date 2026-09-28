import { NextResponse } from "next/server";

import { requireAdminPermission } from "@/lib/auth/admin-access";
import { listLawyerWithdrawals, type LawyerWithdrawalStatus } from "@/lib/payments/lawyer-withdrawals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses = new Set<LawyerWithdrawalStatus>(["pending", "approved", "rejected", "paid"]);

export async function GET(request: Request) {
  const admin = await requireAdminPermission("manage_finance");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const rawStatus = new URL(request.url).searchParams.get("status");
  if (rawStatus && !statuses.has(rawStatus as LawyerWithdrawalStatus)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }
  const withdrawals = await listLawyerWithdrawals(rawStatus as LawyerWithdrawalStatus | undefined);
  return NextResponse.json({ ok: true, withdrawals });
}
