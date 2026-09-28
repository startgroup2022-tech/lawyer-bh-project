import { mobileAdminAuth } from "@/lib/mobile-admin/auth";
import { createMobileAdminAuthHttp } from "@/lib/mobile-admin/auth-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return createMobileAdminAuthHttp(mobileAdminAuth).logout(request);
}
