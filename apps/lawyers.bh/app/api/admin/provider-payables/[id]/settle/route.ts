import { NextResponse } from "next/server";

import { requireAdminPermission } from "@/lib/auth/admin-access";
import { settleDelayedAllocation, SettlementError } from "@/lib/payments/delayed-settlement";

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

  const method = body.method === "tap" ? "tap" : body.method === "bank" ? "bank" : null;
  const transferredAt = new Date(String(body.transferredAt ?? ""));
  if (!method) return NextResponse.json({ ok: false, error: "Invalid settlement method" }, { status: 400 });

  try {
    const { id } = await params;
    const settlement = await settleDelayedAllocation({
      allocationId: id,
      countryCode: String(body.countryCode ?? "BH"),
      method,
      reference: String(body.reference ?? ""),
      transferredAt,
      adminId: admin.id,
    });
    return NextResponse.json({ ok: true, settlement });
  } catch (error) {
    if (error instanceof SettlementError) {
      const status = error.code === "not_found" ? 404 : error.code === "conflict" ? 409 : 400;
      return NextResponse.json({ ok: false, error: error.message }, { status });
    }
    console.error("[provider payable settle] failed", error);
    return NextResponse.json({ ok: false, error: "Settlement failed" }, { status: 500 });
  }
}
