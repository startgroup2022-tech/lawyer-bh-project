import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdvocate } from "@/lib/sos/lawyerAuth";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  isEmergencyReady: boolean;
  locationSharingEnabled: boolean;
}

/** Lets the authenticated advocate flip their own is_emergency_ready
 *  flag. Activation status (set by dispatch on first onboarding) is
 *  unrelated — that's the permission to participate; this is
 *  "am I online right now?". */
export async function POST(req: Request) {
  const auth = await requireAdvocate();
  if (!auth.ok) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (
    typeof body.isEmergencyReady !== "boolean" ||
    typeof body.locationSharingEnabled !== "boolean"
  ) {
    return NextResponse.json({ error: "invalid_value" }, { status: 400 });
  }

  const locationSharingEnabled =
    body.isEmergencyReady && body.locationSharingEnabled;

  try {
    await requireCountryProduct(auth.advocate.countryCode, "legal_sos");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }

  await db
    .update(schema.bahrainLawyers)
    .set({
      isEmergencyReady: body.isEmergencyReady,
      locationSharingEnabled,
      ...(!body.isEmergencyReady
        ? { liveLocation: null, liveLocationUpdatedAt: null }
        : {}),
    })
    .where(
      and(
        eq(schema.bahrainLawyers.id, auth.advocate.id),
        eq(schema.bahrainLawyers.countryCode, auth.advocate.countryCode),
      ),
    );

  return NextResponse.json({
    advocateId: auth.advocate.id,
    isEmergencyReady: body.isEmergencyReady,
    locationSharingEnabled,
    searchable: false,
  });
}
