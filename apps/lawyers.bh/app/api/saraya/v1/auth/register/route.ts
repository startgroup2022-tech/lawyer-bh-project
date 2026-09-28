import { handle, jsonBody, text } from "@/lib/saraya/auth/http";
import { register } from "@/lib/saraya/auth/runtime";
import { requestIp, webSessionResponse } from "@/lib/saraya/auth/security";
import { authRateLimiter } from "@/lib/saraya/auth/store";

export async function POST(request: Request) {
  return handle(async () => {
    const body = await jsonBody(request);
    const email = text(body, "email");
    await authRateLimiter.check("register", requestIp(request), email);
    const value = await register({
      displayNameAr: text(body, "displayNameAr"),
      displayNameEn: text(body, "displayNameEn"),
      email,
      phone: text(body, "phone"),
      password: text(body, "password"),
    });
    return request.headers.get("x-saraya-client") === "native"
      ? Response.json(value, { status: 201 })
      : webSessionResponse(value, 201);
  });
}
