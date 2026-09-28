import bcrypt from "bcryptjs";
import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/admin-access";
import { parseAdminUserCreate } from "@/lib/auth/admin-user-validation";
import { db, schema } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireSuperAdmin())) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const admins = await db.select({
    id: schema.adminUsers.id, fullName: schema.adminUsers.fullName, email: schema.adminUsers.email,
    role: schema.adminUsers.role, isActive: schema.adminUsers.isActive, permissions: schema.adminUsers.permissions,
    lastLoginAt: schema.adminUsers.lastLoginAt, createdAt: schema.adminUsers.createdAt,
  }).from(schema.adminUsers).orderBy(asc(schema.adminUsers.fullName));
  return NextResponse.json({ ok: true, admins });
}

export async function POST(request: Request) {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try {
    const values = parseAdminUserCreate(await request.json());
    const passwordHash = await bcrypt.hash(values.password, 12);
    const [admin] = await db.insert(schema.adminUsers).values({
      fullName: values.fullName, email: values.email, passwordHash, role: values.role,
      permissions: values.permissions, createdByAdminId: actor.id,
      permissionsUpdatedByAdminId: actor.id, permissionsUpdatedAt: new Date(),
    }).returning({
      id: schema.adminUsers.id, fullName: schema.adminUsers.fullName, email: schema.adminUsers.email,
      role: schema.adminUsers.role, isActive: schema.adminUsers.isActive, permissions: schema.adminUsers.permissions,
      lastLoginAt: schema.adminUsers.lastLoginAt, createdAt: schema.adminUsers.createdAt,
    });
    return NextResponse.json({ ok: true, admin }, { status: 201 });
  } catch (error) {
    const duplicate = error instanceof Error && /unique|duplicate/i.test(error.message);
    return NextResponse.json({ ok: false, error: duplicate ? "duplicate_email" : error instanceof Error ? error.message : "invalid_payload" }, { status: duplicate ? 409 : 400 });
  }
}
