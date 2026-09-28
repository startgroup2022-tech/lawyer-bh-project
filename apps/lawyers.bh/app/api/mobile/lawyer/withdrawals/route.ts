import { NextResponse } from "next/server";

import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";
import {
  createLawyerWithdrawal,
  LawyerWithdrawalError,
} from "@/lib/payments/lawyer-withdrawals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const lawyer = await getMobileLawyerSession(request);
  if (!lawyer) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  try {
    const withdrawal = await createLawyerWithdrawal(lawyer.lawyerId, lawyer.countryCode);
    return NextResponse.json({ ok: true, withdrawal }, { status: 201 });
  } catch (error) {
    if (error instanceof LawyerWithdrawalError) {
      const status = error.code === "not_found" ? 404 : 409;
      return NextResponse.json({ ok: false, error: error.code }, { status });
    }
    console.error("[mobile/lawyer/withdrawals] failed", {
      lawyerId: lawyer.lawyerId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "withdrawal_unavailable" }, { status: 503 });
  }
}
