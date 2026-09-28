import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/postmark";
import { bahrainDateFromInstant } from "@/lib/provider/license-expiry-maintenance";
import { runLicenseExpiryMaintenance } from "@/lib/provider/license-expiry-job";
import { postgresLicenseExpiryStore } from "@/lib/provider/license-expiry-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const configured = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!configured || !header?.startsWith("Bearer ")) return false;

  const supplied = header.slice("Bearer ".length);
  const configuredBytes = Buffer.from(configured);
  const suppliedBytes = Buffer.from(supplied);
  return (
    configuredBytes.length === suppliedBytes.length &&
    timingSafeEqual(configuredBytes, suppliedBytes)
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runLicenseExpiryMaintenance({
      runDate: bahrainDateFromInstant(new Date()),
      store: postgresLicenseExpiryStore,
      deliver: sendEmail,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[license-expiry] maintenance failed", { error });
    return NextResponse.json(
      { ok: false, error: "maintenance_failed" },
      { status: 500 },
    );
  }
}
