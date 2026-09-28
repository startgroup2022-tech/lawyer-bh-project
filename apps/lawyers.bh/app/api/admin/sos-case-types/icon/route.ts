import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { validateSosCaseIcon } from "@/lib/sos/icon-validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!(await requireAdminPermission("manage_approvals"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try { const file = (await request.formData()).get("icon"); if (!(file instanceof File)) throw new Error("icon_required"); const valid = validateSosCaseIcon(file); const token = process.env.BLOB_READ_WRITE_TOKEN; if (!token) throw new Error("icon_storage_unavailable"); const key = `sos-case-icons/${randomUUID()}.${valid.extension}`; const blob = await put(key, file, { access: "public", contentType: valid.contentType, token }); return NextResponse.json({ ok: true, iconUrl: blob.url, iconStorageKey: key }); } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "icon_upload_failed" }, { status: 400 }); }
}
