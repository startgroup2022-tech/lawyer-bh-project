import { sqlClient } from "@/lib/db/client";
import { requireMobileAdmin } from "@/lib/mobile-admin/auth";
import { createLiveOverviewHttp } from "@/lib/mobile-admin/live-overview-http";
import { getAdminLiveOverview } from "@/lib/mobile-admin/live-overview-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = createLiveOverviewHttp({
  authorize: requireMobileAdmin,
  overview: (countryCode) => getAdminLiveOverview(sqlClient, countryCode),
});
