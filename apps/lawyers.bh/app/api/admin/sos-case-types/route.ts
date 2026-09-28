import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { createAdminSosCase, listAdminSosCases } from "@/lib/sos/admin-case-repository";
import { parseAdminSosCaseInput, SosCaseAdminError } from "@/lib/sos/admin-case-types";

export const dynamic = "force-dynamic";
const failure = (error: unknown) => { const code = error instanceof SosCaseAdminError ? error.code : error instanceof Error ? error.message : "invalid_payload"; return NextResponse.json({ ok: false, error: code }, { status: /duplicate|unique/i.test(code) ? 409 : 400 }); };

export async function GET(request: Request) {
  if (!(await requireAdminPermission("manage_approvals"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json({ ok: true, cases: await listAdminSosCases(new URL(request.url).searchParams.get("countryCode") ?? "BH") }); } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  const admin = await requireAdminPermission("manage_approvals");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json({ ok: true, item: await createAdminSosCase(parseAdminSosCaseInput(await request.json()), admin.id) }, { status: 201 }); } catch (error) { return failure(error); }
}
