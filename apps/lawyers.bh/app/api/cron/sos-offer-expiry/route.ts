import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { expireLawyerOffers } from "@/lib/sos/offer-expiry";
import { offerExpiryDependencies } from "@/lib/sos/offer-expiry-runtime";
import { runAdminEscalationPush } from "@/lib/mobile-admin/escalation-push-runtime";
import { runPaidRequestAdminNotifications } from "@/lib/mobile-admin/paid-request-notification-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const configured = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!configured || !header?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(configured);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const result = await expireLawyerOffers({ now: new Date(), limit: 50 }, offerExpiryDependencies)
    .catch((error: unknown) => {
      console.error("[sos-offer-expiry] failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return null;
    });
  const adminPush = await runAdminEscalationPush({ now: new Date(), limit: 50 })
    .catch(() => ({ error: "unavailable" as const }));
  const paidAdminNotifications = await runPaidRequestAdminNotifications({ now: new Date(), limit: 50 })
    .catch(() => ({ error: "unavailable" as const }));
  if (!result) {
    return NextResponse.json({ ok: false, error: "offer_expiry_failed", adminPush, paidAdminNotifications }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...result, adminPush, paidAdminNotifications });
}
