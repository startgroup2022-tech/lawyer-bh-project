import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { termsManagementError } from "@/lib/terms-management/http";
import { archiveTermsVersion, updateTermsDraft } from "@/lib/terms-management/service";
import { parseDocumentType as documentType, parseTermsDraftInput } from "@/lib/terms-management/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPermission("manage_terms_commissions");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.action === "archive") {
      const version = await archiveTermsVersion((await params).id, { adminId: admin.id });
      return NextResponse.json({ ok: true, version });
    }
    const input = parseTermsDraftInput(body, documentType(body.documentType));
    const version = await updateTermsDraft((await params).id, input, { adminId: admin.id });
    return NextResponse.json({ ok: true, version });
  } catch (error) {
    return termsManagementError(error);
  }
}
