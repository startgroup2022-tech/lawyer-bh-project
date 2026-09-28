import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema } from "@/lib/db/client";

async function requireAdmin() {
  const cookieStore = await cookies();
  const adminId = cookieStore.get("admin_session")?.value;

  if (!adminId) return null;

  const [admin] = await db
    .select({
      id: schema.adminUsers.id,
      isActive: schema.adminUsers.isActive,
    })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.id, adminId))
    .limit(1);

  if (!admin || !admin.isActive) return null;

  return admin.id;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminId = await requireAdmin();

  if (!adminId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  const [updated] = await db
    .update(schema.saudiLawyers)
    .set({
      status: "approved",
      isActive: true,
      suspensionType: null,
      suspensionReason: null,
      suspendedAt: null,
      suspendedBy: null,
      reviewedAt: new Date(),
      reviewedBy: adminId,
      updatedAt: new Date(),
    })
    .where(eq(schema.saudiLawyers.id, id))
    .returning({
      id: schema.saudiLawyers.id,
    });

  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Application not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: updated.id,
  });
}
