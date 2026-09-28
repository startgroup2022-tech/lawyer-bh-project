// POST /api/auth/logout
// Revokes the current session and clears the cookie.

import { NextResponse } from "next/server";
import { getAdminSession, destroyAdminSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getAdminSession();
  if (session) {
    await db.insert(schema.auditLog).values({
      actorAdminId: session.adminUserId,
      action: "admin.signout",
      targetType: "admin_user",
      targetId: session.adminUserId,
    });
  }
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}
