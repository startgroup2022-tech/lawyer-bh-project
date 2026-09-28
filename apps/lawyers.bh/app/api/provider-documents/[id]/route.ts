import { NextRequest } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { getProviderSessionFromRequest } from "@/app/api/provider/_session";
import { documentOwner, privateDownload } from "@/lib/uploads/documents";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin =
    (await requireAdminPermission("manage_lawyers")) ||
    (await requireAdminPermission("manage_approvals"));
  const provider = getProviderSessionFromRequest(request);
  if (!admin && !provider) return new Response(null, { status: 401 });
  try {
    const { id } = await context.params;
    const owner = await documentOwner(id);
    if (
      !owner ||
      (!admin &&
        (!owner.is_active ||
          owner.id !== provider?.providerId ||
          owner.country_code !== provider?.countryCode))
    )
      return new Response(null, { status: 404 });
    return new Response(null, {
      status: 302,
      headers: {
        Location: await privateDownload(id),
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
