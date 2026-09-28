import { sqlClient } from "@/lib/db/client";
import { requireMobileAdmin } from "@/lib/mobile-admin/auth";
import { listEligibleLawyers } from "@/lib/mobile-admin/escalated-requests-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request, context: { params: Promise<{ requestId: string }> }) {
  if (!(await requireMobileAdmin(request))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  const { requestId } = await context.params;
  const cursor = new URL(request.url).searchParams.get("cursor");
  if (!uuid.test(requestId) || (cursor && !uuid.test(cursor))) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400, headers });
  }
  const result = await listEligibleLawyers(sqlClient, requestId, cursor);
  return Response.json({ ok: true, ...result }, { headers });
}
