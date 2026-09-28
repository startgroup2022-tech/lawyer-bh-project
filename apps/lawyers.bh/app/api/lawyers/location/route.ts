import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const session = await getMobileLawyerSession(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        lawyerId?: string;
        latitude?: number;
        longitude?: number;
        accuracy?: number;
      }
    | null;

  const lawyerId = String(body?.lawyerId || "");
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);

  if (
    lawyerId !== session.lawyerId ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid location data" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(schema.bahrainLawyers)
    .set({
      baseLocation: {
        lat: latitude,
        lng: longitude,
      },
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.bahrainLawyers.id, lawyerId),
        eq(schema.bahrainLawyers.countryCode, session.countryCode),
      ),
    )
    .returning({ id: schema.bahrainLawyers.id });

  if (!updated) {
    return NextResponse.json(
      { success: false, message: "Lawyer not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
