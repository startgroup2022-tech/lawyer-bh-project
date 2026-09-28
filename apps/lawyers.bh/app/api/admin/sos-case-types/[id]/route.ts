import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { updateAdminSosCase } from "@/lib/sos/admin-case-repository";
import { parseAdminSosCaseInput, SosCaseAdminError } from "@/lib/sos/admin-case-types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPermission("manage_approvals");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try {
    const source = await request.json(); const expected = new Date(source.expectedUpdatedAt);
    if (Number.isNaN(expected.valueOf())) throw new SosCaseAdminError("invalid_updated_at");
    return NextResponse.json({ ok: true, item: await updateAdminSosCase((await params).id, parseAdminSosCaseInput(source), expected, admin.id) });
  } catch (error) { const code = error instanceof SosCaseAdminError ? error.code : error instanceof Error ? error.message : "invalid_payload"; return NextResponse.json({ ok: false, error: code }, { status: code === "stale_or_missing_case" ? 409 : 400 }); }
}
