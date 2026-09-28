import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdvocate } from "@/lib/sos/lawyerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Deletes a single shift owned by the calling advocate. The
 *  advocate-id clause in WHERE keeps an attacker from deleting
 *  someone else's shift even if they guess the UUID. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdvocate();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;
  const result = await db
    .delete(schema.advocateShifts)
    .where(
      and(
        eq(schema.advocateShifts.id, id),
        eq(schema.advocateShifts.advocateId, auth.advocate.id),
        eq(schema.advocateShifts.countryCode, auth.advocate.countryCode),
      ),
    )
    .returning({ id: schema.advocateShifts.id });
  if (result.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, id });
}
