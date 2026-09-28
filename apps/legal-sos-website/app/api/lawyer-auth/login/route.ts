import { NextResponse } from "next/server";
import { z } from "zod";

import {
  LAWYER_SESSION_COOKIE,
  fetchLawyerBackend,
  lawyerCookieOptions,
  requireSameOrigin,
  sanitizeLawyerSession,
} from "@/lib/lawyer-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const credentialsSchema = z.object({
  countryCode: z.string().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  licenseNumber: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!requireSameOrigin(request)) return json({ ok: false, error: "FORBIDDEN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ ok: false, error: "INVALID_REQUEST" }, 400);
  }

  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: "INVALID_REQUEST" }, 400);

  try {
    const loginResponse = await fetchLawyerBackend("/api/lawyers/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const loginPayload = await loginResponse.json().catch(() => null) as
      | { data?: { token?: unknown } }
      | null;

    if (!loginResponse.ok) {
      const accountUnavailable = loginResponse.status === 403;
      return json(
        { ok: false, error: accountUnavailable ? "ACCOUNT_UNAVAILABLE" : "INVALID_CREDENTIALS" },
        accountUnavailable ? 403 : 401,
      );
    }

    const token = typeof loginPayload?.data?.token === "string" ? loginPayload.data.token : null;
    if (!token) return json({ ok: false, error: "SERVICE_UNAVAILABLE" }, 503);

    const sessionResponse = await fetchLawyerBackend(
      "/api/mobile/lawyer/session",
      { method: "GET" },
      token,
    );
    const lawyer = sanitizeLawyerSession(await sessionResponse.json().catch(() => null));
    if (!sessionResponse.ok || !lawyer) {
      return json({ ok: false, error: "SERVICE_UNAVAILABLE" }, 503);
    }

    const response = json({ ok: true, lawyer }, 200);
    response.cookies.set(LAWYER_SESSION_COOKIE, token, lawyerCookieOptions());
    return response;
  } catch {
    return json({ ok: false, error: "SERVICE_UNAVAILABLE" }, 503);
  }
}
