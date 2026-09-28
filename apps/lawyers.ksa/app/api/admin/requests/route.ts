import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getAdminSession } from "@/lib/auth/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const requests = await db
    .select({
      id: schema.emergencyRequests.id,
      countryCode: schema.emergencyRequests.countryCode,
      caseRef: schema.emergencyRequests.caseRef,
      caseType: schema.emergencyRequests.caseType,
      contactName: schema.emergencyRequests.contactName,
      contactPhone: schema.emergencyRequests.contactPhone,
      paymentStatus: schema.emergencyRequests.paymentStatus,
      serviceStatus: schema.emergencyRequests.serviceStatus,
      createdAt: schema.emergencyRequests.createdAt,
    })
    .from(schema.emergencyRequests)
    .orderBy(desc(schema.emergencyRequests.createdAt))
    .limit(100);

  return NextResponse.json({
    ok: true,
    requests,
  });
}