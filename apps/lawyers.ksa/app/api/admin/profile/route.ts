import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin-access";
import { setAdminSession } from "@/lib/auth/admin-session";
import { parseAdminProfilePayload } from "@/lib/auth/admin-profile-validation";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const values = parseAdminProfilePayload(await request.json(), admin.email);
    const [security] = await db.select({ passwordHash: schema.adminUsers.passwordHash })
      .from(schema.adminUsers).where(eq(schema.adminUsers.id, admin.id)).limit(1);
    if ((values.emailChanged || values.newPassword) && (!security || !(await bcrypt.compare(values.currentPassword, security.passwordHash)))) {
      return NextResponse.json({ ok: false, error: "incorrect_current_password" }, { status: 400 });
    }

    const update: { fullName: string; email: string; phone: string | null; passwordHash?: string; updatedAt: Date } = {
      fullName: values.fullName, email: values.email, phone: values.phone || null, updatedAt: new Date(),
    };
    if (values.newPassword) update.passwordHash = await bcrypt.hash(values.newPassword, 12);

    const [updated] = await db.update(schema.adminUsers).set(update).where(eq(schema.adminUsers.id, admin.id)).returning({
      id: schema.adminUsers.id, fullName: schema.adminUsers.fullName, email: schema.adminUsers.email,
      phone: schema.adminUsers.phone, avatarUrl: schema.adminUsers.avatarUrl, role: schema.adminUsers.role,
      isActive: schema.adminUsers.isActive, permissions: schema.adminUsers.permissions,
    });
    if (values.emailChanged) await setAdminSession({ id: admin.id, email: updated.email, role: updated.role });
    return NextResponse.json({ ok: true, admin: updated });
  } catch (error) {
    const duplicate = error instanceof Error && /unique|duplicate/i.test(error.message);
    return NextResponse.json({ ok: false, error: duplicate ? "duplicate_email" : error instanceof Error ? error.message : "invalid_payload" }, { status: duplicate ? 409 : 400 });
  }
}
