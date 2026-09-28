import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { termsManagementError } from "@/lib/terms-management/http";
import { publishTermsVersion } from "@/lib/terms-management/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPermission("manage_terms_commissions");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.confirmation !== "PUBLISH") {
      return NextResponse.json({ ok: false, error: "publish_confirmation_required" }, { status: 400 });
    }
    const version = await publishTermsVersion((await params).id, { adminId: admin.id });
    return NextResponse.json({ ok: true, version });
  } catch (error) {
    return termsManagementError(error);
  }
}
