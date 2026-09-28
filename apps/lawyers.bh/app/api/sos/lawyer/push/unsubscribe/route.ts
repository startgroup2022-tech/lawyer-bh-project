import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdvocate } from "@/lib/sos/lawyerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  endpoint: string;
}

/** Removes a single push subscription for the authenticated advocate.
 *  Endpoint-scoped, so the advocate can unsubscribe one device without
 *  affecting their other browsers / phones. */
export async function POST(req: Request) {
  const auth = await requireAdvocate();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.endpoint) {
    return NextResponse.json({ error: "missing_endpoint" }, { status: 400 });
  }
  await db
    .delete(schema.lawyerPushSubscriptions)
    .where(
      and(
        eq(schema.lawyerPushSubscriptions.advocateId, auth.advocate.id),
        eq(schema.lawyerPushSubscriptions.countryCode, auth.advocate.countryCode),
        eq(schema.lawyerPushSubscriptions.endpoint, body.endpoint),
      ),
    );
  return NextResponse.json({ ok: true });
}
