import { sqlClient } from "@/lib/db/client";
import { requireMobileAdmin } from "@/lib/mobile-admin/auth";
import { createEscalatedRequestsHttp } from "@/lib/mobile-admin/escalated-requests-http";
import { listEscalatedRequests } from "@/lib/mobile-admin/escalated-requests-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = createEscalatedRequestsHttp({
  authorize: requireMobileAdmin,
  list: (cursor) => listEscalatedRequests(sqlClient, cursor),
});
