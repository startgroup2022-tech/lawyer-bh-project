import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema } from "@/lib/db/client";

type SuspensionType =
  | "bad_service"
  | "license_expired"
  | "complaints"
  | "documents_invalid"
  | "other";

const allowedTypes: SuspensionType[] = [
  "bad_service",
  "license_expired",
  "complaints",
  "documents_invalid",
  "other",
];

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
  request: NextRequest,
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

  let body: {
    type?: string;
    reason?: string;
  } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const suspensionType = String(body.type ?? "").trim() as SuspensionType;
  const suspensionReason = String(body.reason ?? "").trim();

  if (!allowedTypes.includes(suspensionType)) {
    return NextResponse.json(
      { ok: false, error: "Invalid suspension type" },
      { status: 400 },
    );
  }

  if (!suspensionReason) {
    return NextResponse.json(
      { ok: false, error: "Suspension reason is required" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(schema.saudiLawyers)
    .set({
      status: "suspended",
      isActive: false,
      suspensionType,
      suspensionReason,
      suspendedAt: new Date(),
      suspendedBy: adminId,
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
