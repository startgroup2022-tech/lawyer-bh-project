import { mobileAdminAuth } from "@/lib/mobile-admin/auth";
import { createMobileAdminAuthHttp } from "@/lib/mobile-admin/auth-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return createMobileAdminAuthHttp(mobileAdminAuth).me(request);
}
