import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { termsManagementError } from "@/lib/terms-management/http";
import { createTermsDraft, listTermsVersions } from "@/lib/terms-management/service";
import { parseDocumentType as documentType, parseTermsDraftInput } from "@/lib/terms-management/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdminPermission("manage_terms_commissions"))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  try {
    const type = documentType(new URL(request.url).searchParams.get("documentType"));
    return NextResponse.json({ ok: true, versions: await listTermsVersions(type) });
  } catch (error) {
    return termsManagementError(error);
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminPermission("manage_terms_commissions");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const input = parseTermsDraftInput(body, documentType(body.documentType));
    const version = await createTermsDraft(input, { adminId: admin.id });
    return NextResponse.json({ ok: true, version }, { status: 201 });
  } catch (error) {
    return termsManagementError(error);
  }
}
