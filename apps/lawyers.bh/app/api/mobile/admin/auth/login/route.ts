import { mobileAdminAuth } from "@/lib/mobile-admin/auth";
import { createMobileAdminAuthHttp } from "@/lib/mobile-admin/auth-http";
import { takeMobileAdminLoginAttempt } from "@/lib/mobile-admin/login-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    return await createMobileAdminAuthHttp(mobileAdminAuth, takeMobileAdminLoginAttempt).login(request);
  } catch {
    return Response.json({ ok: false, error: "Authentication unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
