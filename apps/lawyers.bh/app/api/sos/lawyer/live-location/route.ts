import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";
import { parseLiveLocationReport } from "@/lib/sos/live-location-contract";
import { requireAdvocate } from "@/lib/sos/lawyerAuth";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authenticatedLawyer(request: Request) {
  const mobile = await getMobileLawyerSession(request);
  if (mobile) {
    return { id: mobile.lawyerId, countryCode: mobile.countryCode };
  }

  if (request.headers.has('authorization')) return null;
  const web = await requireAdvocate();
  return web.ok
    ? { id: web.advocate.id, countryCode: web.advocate.countryCode }
    : null;
}

export async function POST(request: Request) {
  const lawyer = await authenticatedLawyer(request);
  if (!lawyer) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const serverNow = new Date();
  let report;
  try {
    report = parseLiveLocationReport(body, serverNow);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "invalid_payload" },
      { status: 400 },
    );
  }

  try {
    await requireCountryProduct(lawyer.countryCode, "legal_sos");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (!mapped) throw error;
    if (mapped.body.error !== "COUNTRY_PRODUCT_DISABLED") {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    const [assignedCase] = await db
      .select({ id: schema.emergencyRequests.id })
      .from(schema.emergencyRequests)
      .where(
        and(
          eq(schema.emergencyRequests.assignedLawyerId, lawyer.id),
          eq(schema.emergencyRequests.countryCode, lawyer.countryCode),
          eq(schema.emergencyRequests.serviceStatus, "mobilizing"),
        ),
      )
      .limit(1);
    if (!assignedCase) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
  }

  const [updated] = await db
    .update(schema.bahrainLawyers)
    .set({
      liveLocation: {
        lat: report.latitude,
        lng: report.longitude,
        accuracy: report.accuracy,
        reportedAt: report.reportedAt.toISOString(),
      },
      liveLocationUpdatedAt: serverNow,
    })
    .where(
      and(
        eq(schema.bahrainLawyers.id, lawyer.id),
        eq(schema.bahrainLawyers.countryCode, lawyer.countryCode),
        eq(schema.bahrainLawyers.isEmergencyReady, true),
        eq(schema.bahrainLawyers.locationSharingEnabled, true),
      ),
    )
    .returning({ id: schema.bahrainLawyers.id });

  if (!updated) {
    return NextResponse.json(
      { error: "location_sharing_not_enabled" },
      { status: 409 },
    );
  }

  await db
    .update(schema.emergencyRequests)
    .set({
      lastAdvocateLocation: {
        lat: report.latitude,
        lng: report.longitude,
        accuracy: report.accuracy,
        reportedAt: report.reportedAt.toISOString(),
      },
      updatedAt: serverNow,
    })
    .where(
      and(
        eq(schema.emergencyRequests.assignedLawyerId, lawyer.id),
        eq(schema.emergencyRequests.countryCode, lawyer.countryCode),
        eq(schema.emergencyRequests.serviceStatus, "mobilizing"),
      ),
    );

  return NextResponse.json({
    reportedAt: serverNow.toISOString(),
    freshUntil: new Date(serverNow.getTime() + 5 * 60 * 1000).toISOString(),
  });
}
