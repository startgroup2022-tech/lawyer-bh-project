import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: Context) {
  const session = await getMobileLawyerSession(request);
  const { id } = await params;

  if (!session || session.lawyerId !== id) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { status?: string }
    | null;
  const requestedStatus = String(body?.status || "").toLowerCase();

  if (!['available', 'offline'].includes(requestedStatus)) {
    return NextResponse.json(
      { success: false, message: "Invalid availability status" },
      { status: 400 },
    );
  }

  try {
    await requireCountryProduct(session.countryCode, "legal_sos");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }

  const [updated] = await db
    .update(schema.bahrainLawyers)
    .set({
      isEmergencyReady: requestedStatus === 'available',
      locationSharingEnabled: requestedStatus === 'available',
      ...(requestedStatus === 'offline'
        ? { liveLocation: null, liveLocationUpdatedAt: null }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.bahrainLawyers.id, id),
        eq(schema.bahrainLawyers.countryCode, session.countryCode),
        eq(schema.bahrainLawyers.status, 'approved'),
        eq(schema.bahrainLawyers.isActive, true),
      ),
    )
    .returning({ id: schema.bahrainLawyers.id });

  if (!updated) {
    return NextResponse.json(
      { success: false, message: "Active lawyer not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id,
      countryCode: session.countryCode,
      status: requestedStatus,
      isAvailable: requestedStatus === 'available',
    },
  });
}
