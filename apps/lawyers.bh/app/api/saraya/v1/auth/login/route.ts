import { handle, jsonBody, text } from "@/lib/saraya/auth/http";
import { login } from "@/lib/saraya/auth/runtime";
import { requestIp, webSessionResponse } from "@/lib/saraya/auth/security";
import { authRateLimiter } from "@/lib/saraya/auth/store";
export async function POST(request: Request) { return handle(async () => { const body = await jsonBody(request); const identity = text(body, "identity"); await authRateLimiter.check("login", requestIp(request), identity); const value = await login(identity, text(body, "password")); return request.headers.get("x-saraya-client") === "native" ? Response.json(value) : webSessionResponse(value); }); }
