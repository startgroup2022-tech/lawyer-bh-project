import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public rating endpoint. The client posts after the dispatch board
 *  has marked the case as completed. We accept ratings only on
 *  completed cases and only once per case. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ caseRef: string }> },
) {
  const { caseRef } = await params;
  let body: { stars?: number; comment?: string };
  try {
    body = (await req.json()) as { stars?: number; comment?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "invalid_stars" }, { status: 400 });
  }
  const comment = (body.comment ?? "").toString().slice(0, 500);

  const [row] = await db
    .select({
      id: schema.emergencyRequests.id,
      serviceStatus: schema.emergencyRequests.serviceStatus,
      ratingStars: schema.emergencyRequests.ratingStars,
    })
    .from(schema.emergencyRequests)
    .where(eq(schema.emergencyRequests.caseRef, caseRef))
    .limit(1);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.serviceStatus !== "completed") {
    return NextResponse.json(
      { error: "not_completed", status: row.serviceStatus },
      { status: 409 },
    );
  }
  if (row.ratingStars != null) {
    return NextResponse.json(
      { error: "already_rated", stars: row.ratingStars },
      { status: 409 },
    );
  }
  await db
    .update(schema.emergencyRequests)
    .set({ ratingStars: stars, ratingComment: comment, updatedAt: new Date() })
    .where(eq(schema.emergencyRequests.id, row.id));
  return NextResponse.json({ caseRef, stars });
}
