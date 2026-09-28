import { type NextRequest } from "next/server";
import { getProviderSessionFromRequest } from "../_session";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { agreements } from "@/lib/provider-agreement/repository";
import { endpoint, privateHeaders } from "@/lib/provider-agreement/http";
import { AgreementError } from "@/lib/provider-agreement/model";
import { renderProviderPdf } from "@/lib/provider-agreement/pdf";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return endpoint(request, async () => {
    const session = getProviderSessionFromRequest(request);
    const id = request.nextUrl.searchParams.get("id") || session?.providerId;
    const owner =
      !!id && session?.providerId === id && session.countryCode === "BH";
    if (!owner && !(await requireAdminPermission("manage_terms_commissions")))
      throw new AgreementError("forbidden", 403);
    if (!id) throw new AgreementError("invalid_id");
    const bytes = await renderProviderPdf(await agreements.snapshot(id));
    const disposition =
      request.nextUrl.searchParams.get("download") === "1"
        ? "attachment"
        : "inline";
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition":
          disposition + "; filename=provider-agreement.pdf",
      },
    });
  });
}
