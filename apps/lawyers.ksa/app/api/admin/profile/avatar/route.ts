import { randomUUID } from "crypto";
import { del, put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin-access";
import { validateAdminAvatar } from "@/lib/auth/admin-profile-validation";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
const extensionByType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const file = (await request.formData()).get("avatar");
    if (!(file instanceof File)) throw new Error("avatar_required");
    validateAdminAvatar(file);
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new Error("avatar_storage_unavailable");
    const blob = await put(`admin-avatars/${admin.id}/${randomUUID()}.${extensionByType[file.type]}`, file, { access: "public", contentType: file.type, token });
    await db.update(schema.adminUsers).set({ avatarUrl: blob.url, updatedAt: new Date() }).where(eq(schema.adminUsers.id, admin.id));
    if (admin.avatarUrl) await del(admin.avatarUrl, { token }).catch(() => undefined);
    return NextResponse.json({ ok: true, avatarUrl: blob.url });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "avatar_upload_failed" }, { status: 400 });
  }
}

export async function DELETE() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  await db.update(schema.adminUsers).set({ avatarUrl: null, updatedAt: new Date() }).where(eq(schema.adminUsers.id, admin.id));
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (admin.avatarUrl && token) await del(admin.avatarUrl, { token }).catch(() => undefined);
  return NextResponse.json({ ok: true, avatarUrl: null });
}
