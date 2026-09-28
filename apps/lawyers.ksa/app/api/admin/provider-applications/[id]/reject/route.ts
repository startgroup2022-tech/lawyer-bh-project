import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Application id is required" },
      { status: 400 },
    );
  }

  let body: { reason?: string } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const reason = String(body.reason ?? "").trim().slice(0, 500);

  if (!reason) {
    return NextResponse.json(
      { ok: false, error: "Rejection reason is required" },
      { status: 400 },
    );
  }

  try {
    const [application] = await db
      .select({
        id: schema.saudiLawyers.id,
        status: schema.saudiLawyers.status,
      })
      .from(schema.saudiLawyers)
      .where(eq(schema.saudiLawyers.id, id))
      .limit(1);

    if (!application) {
      return NextResponse.json(
        { ok: false, error: "Application not found" },
        { status: 404 },
      );
    }

    if (application.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: "Application is already reviewed" },
        { status: 409 },
      );
    }

    await db
      .update(schema.saudiLawyers)
      .set({
        status: "rejected",
        isActive: false,
        reviewedAt: new Date(),
        reviewedBy: "admin",
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(schema.saudiLawyers.id, id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin reject application] failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not reject application" },
      { status: 500 },
    );
  }
}