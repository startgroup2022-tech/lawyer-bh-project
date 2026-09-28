import type { NextRequest } from "next/server";
import { getProviderSessionFromRequest } from "../_session";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { agreementFiles } from "@/lib/provider-agreement/repository";
import { endpoint, privateHeaders } from "@/lib/provider-agreement/http";
import { AgreementError } from "@/lib/provider-agreement/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return endpoint(request, async () => {
    const session = getProviderSessionFromRequest(request),
      providerId =
        request.nextUrl.searchParams.get("providerId") || session?.providerId,
      fileId = request.nextUrl.searchParams.get("fileId");
    if (
      !(
        providerId &&
        session?.providerId === providerId &&
        session.countryCode === "BH"
      ) &&
      !(await requireAdminPermission("manage_terms_commissions"))
    )
      throw new AgreementError("forbidden", 403);
    if (!providerId || !fileId) throw new AgreementError("invalid_id");
    const file = await agreementFiles.download(fileId, providerId);
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        ...privateHeaders,
        "Content-Type": file.mime,
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "Content-Disposition": `attachment; filename="agreement-attachment"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      },
    });
  });
}
