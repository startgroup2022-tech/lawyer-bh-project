import { NextResponse } from "next/server";

import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";
import { getLawyerEarnings } from "@/lib/payments/lawyer-withdrawals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const lawyer = await getMobileLawyerSession(request);
  if (!lawyer) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  try {
    const summary = await getLawyerEarnings(lawyer.lawyerId, lawyer.countryCode);
    return NextResponse.json({ ok: true, summary }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[mobile/lawyer/earnings] failed", {
      lawyerId: lawyer.lawyerId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "earnings_unavailable" }, { status: 503 });
  }
}
