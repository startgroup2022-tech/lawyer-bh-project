import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdvocate } from "@/lib/sos/lawyerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  isEmergencyReady: boolean;
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
  if (typeof body.isEmergencyReady !== "boolean") {
    return NextResponse.json({ error: "invalid_value" }, { status: 400 });
  }

  await db
    .update(schema.saudiLawyers)
    .set({ isEmergencyReady: body.isEmergencyReady })
    .where(
      and(
        eq(schema.saudiLawyers.id, auth.advocate.id),
        eq(schema.saudiLawyers.countryCode, auth.advocate.countryCode),
      ),
    );

  return NextResponse.json({
    advocateId: auth.advocate.id,
    isEmergencyReady: body.isEmergencyReady,
  });
}
