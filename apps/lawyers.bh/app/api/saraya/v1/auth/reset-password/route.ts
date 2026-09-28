import { resetPassword } from "@/lib/saraya/auth/challenges";
import { handle, jsonBody, text } from "@/lib/saraya/auth/http";
import { requestIp } from "@/lib/saraya/auth/security";
import { authRateLimiter } from "@/lib/saraya/auth/store";
export async function POST(request: Request) { return handle(async () => { const body = await jsonBody(request); const token = text(body, "token"); await authRateLimiter.check("reset", requestIp(request), token); await resetPassword(token, text(body, "password")); return new Response(null, { status: 204 }); }); }
