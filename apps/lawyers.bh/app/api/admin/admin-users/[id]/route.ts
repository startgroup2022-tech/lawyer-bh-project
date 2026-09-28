import bcrypt from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/admin-access";
import { parseAdminUserUpdate } from "@/lib/auth/admin-user-validation";
import { db, schema } from "@/lib/db/client";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const values = parseAdminUserUpdate(await request.json());
    if (id === actor.id && values.isActive === false) return NextResponse.json({ ok: false, error: "cannot_disable_self" }, { status: 400 });
    if (id === actor.id && values.role === "admin") return NextResponse.json({ ok: false, error: "cannot_change_own_role" }, { status: 400 });
    if (values.role === "admin") {
      const [target] = await db.select({ role: schema.adminUsers.role, isActive: schema.adminUsers.isActive }).from(schema.adminUsers).where(eq(schema.adminUsers.id, id)).limit(1);
      if (target?.role === "super_admin" && target.isActive) {
        const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.adminUsers)
          .where(and(eq(schema.adminUsers.role, "super_admin"), eq(schema.adminUsers.isActive, true), ne(schema.adminUsers.id, id)));
        if (count < 1) return NextResponse.json({ ok: false, error: "last_super_admin" }, { status: 400 });
      }
    }
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (values.fullName !== undefined) update.fullName = values.fullName;
    if (values.email !== undefined) update.email = values.email;
    if (values.isActive !== undefined) update.isActive = values.isActive;
    if (values.role !== undefined) update.role = values.role;
    if (values.password) update.passwordHash = await bcrypt.hash(values.password, 12);
    if (values.permissions) {
      update.permissions = values.permissions;
      update.permissionsUpdatedByAdminId = actor.id;
      update.permissionsUpdatedAt = new Date();
    }
    const [admin] = await db.update(schema.adminUsers).set(update).where(eq(schema.adminUsers.id, id)).returning({
      id: schema.adminUsers.id, fullName: schema.adminUsers.fullName, email: schema.adminUsers.email,
      role: schema.adminUsers.role, isActive: schema.adminUsers.isActive, permissions: schema.adminUsers.permissions,
      lastLoginAt: schema.adminUsers.lastLoginAt, createdAt: schema.adminUsers.createdAt,
    });
    if (!admin) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, admin });
  } catch (error) {
    const duplicate = error instanceof Error && /unique|duplicate/i.test(error.message);
    return NextResponse.json({ ok: false, error: duplicate ? "duplicate_email" : error instanceof Error ? error.message : "invalid_payload" }, { status: duplicate ? 409 : 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (id === actor.id) return NextResponse.json({ ok: false, error: "cannot_disable_self" }, { status: 400 });
  const [target] = await db.select({ role: schema.adminUsers.role }).from(schema.adminUsers).where(eq(schema.adminUsers.id, id)).limit(1);
  if (!target) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (target.role === "super_admin") {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.adminUsers)
      .where(and(eq(schema.adminUsers.role, "super_admin"), eq(schema.adminUsers.isActive, true), ne(schema.adminUsers.id, id)));
    if (count < 1) return NextResponse.json({ ok: false, error: "last_super_admin" }, { status: 400 });
  }
  await db.update(schema.adminUsers).set({ isActive: false, updatedAt: new Date() }).where(eq(schema.adminUsers.id, id));
  return NextResponse.json({ ok: true });
}
