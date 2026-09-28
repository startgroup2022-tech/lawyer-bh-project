import { NextResponse } from "next/server";

import {
  LAWYER_SESSION_COOKIE,
  fetchLawyerBackend,
  lawyerCookieOptions,
  readLawyerToken,
  requireSameOrigin,
  sanitizeLawyerSession,
} from "@/lib/lawyer-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function clearCookie(response: NextResponse) {
  response.cookies.set(LAWYER_SESSION_COOKIE, "", {
    ...lawyerCookieOptions(),
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const token = readLawyerToken(request);
  if (!token) return json({ ok: false, error: "UNAUTHORIZED" }, 401);

  try {
    const upstream = await fetchLawyerBackend(
      "/api/mobile/lawyer/session",
      { method: "GET" },
      token,
    );
    const lawyer = sanitizeLawyerSession(await upstream.json().catch(() => null));
    if (!upstream.ok || !lawyer) {
      const status = upstream.status === 401 || upstream.status === 403 ? upstream.status : 503;
      const error = upstream.status === 403 ? "ACCOUNT_UNAVAILABLE" : "UNAUTHORIZED";
      const response = json({ ok: false, error: status === 503 ? "SERVICE_UNAVAILABLE" : error }, status);
      return status === 401 || status === 403 ? clearCookie(response) : response;
    }
    return json({ ok: true, lawyer }, 200);
  } catch {
    return json({ ok: false, error: "SERVICE_UNAVAILABLE" }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!requireSameOrigin(request)) return json({ ok: false, error: "FORBIDDEN" }, 403);
  return clearCookie(json({ ok: true }, 200));
}
