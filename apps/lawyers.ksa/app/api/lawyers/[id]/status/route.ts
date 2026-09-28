import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: Context) {
  const session = getMobileLawyerSession(request);
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

  const [updated] = await db
    .update(schema.saudiLawyers)
    .set({
      isEmergencyReady: requestedStatus === 'available',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.saudiLawyers.id, id),
        eq(schema.saudiLawyers.countryCode, session.countryCode),
        eq(schema.saudiLawyers.status, 'approved'),
        eq(schema.saudiLawyers.isActive, true),
      ),
    )
    .returning({ id: schema.saudiLawyers.id });

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
