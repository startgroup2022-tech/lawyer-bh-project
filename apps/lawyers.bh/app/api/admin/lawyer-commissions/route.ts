import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { termsManagementError } from "@/lib/terms-management/http";
import {
  listLawyerCommissionRows,
  setLawyerCommissionOverride,
} from "@/lib/terms-management/commissions";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!(await requireAdminPermission("manage_terms_commissions")))
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 },
    );
  const u = new URL(request.url);
  try { return NextResponse.json({
    ok: true,
    lawyers: await listLawyerCommissionRows({
      query: u.searchParams.get("query") ?? "",
      countryCode: u.searchParams.get("countryCode") ?? "",
    }),
  }); } catch (error) { return termsManagementError(error); }
}
export async function PATCH(request: Request) {
  const admin = await requireAdminPermission("manage_terms_commissions");
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 },
    );
  try {
    const body = await request.json();
    return NextResponse.json({
      ok: true,
      rate: await setLawyerCommissionOverride(
        {
          lawyerId: String(body.lawyerId ?? ""),
          countryCode: String(body.countryCode ?? ""),
          platformPercentage: String(body.platformPercentage ?? ""),
          effectiveFrom: String(body.effectiveFrom ?? new Date().toISOString()),
          reason: body.reason ? String(body.reason) : null,
        },
        { adminId: admin.id },
      ),
    });
  } catch (error) {
    return termsManagementError(error);
  }
}
