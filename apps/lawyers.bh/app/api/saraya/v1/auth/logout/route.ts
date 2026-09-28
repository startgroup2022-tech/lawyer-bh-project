import { handle } from "@/lib/saraya/auth/http";
import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { sessions } from "@/lib/saraya/auth/runtime";
import { clearWebSessionCookies } from "@/lib/saraya/auth/security";
export async function POST(request: Request) { return handle(async () => { const service = sessions(); const principal = await requireSarayaPrincipal(request, service); await service.revoke(principal.sessionId); return clearWebSessionCookies(); }); }
