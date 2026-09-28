import { sqlClient } from "@/lib/db/client";
import { requireMobileAdmin } from "@/lib/mobile-admin/auth";
import { getEscalatedRequest } from "@/lib/mobile-admin/escalated-requests-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request, context: { params: Promise<{ requestId: string }> }) {
  if (!(await requireMobileAdmin(request))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  const { requestId } = await context.params;
  if (!uuid.test(requestId)) return Response.json({ ok: false, error: "Invalid request" }, { status: 400, headers });
  const detail = await getEscalatedRequest(sqlClient, requestId);
  return detail
    ? Response.json({ ok: true, request: detail }, { headers })
    : Response.json({ ok: false, error: "Request unavailable" }, { status: 404, headers });
}
