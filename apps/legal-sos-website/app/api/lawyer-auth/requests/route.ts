import { NextResponse } from "next/server";

import {
  fetchLawyerBackend,
  readLawyerToken,
  sanitizeLawyerRequests,
} from "@/lib/lawyer-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const token = readLawyerToken(request);
  if (!token) return json({ ok: false, error: "UNAUTHORIZED" }, 401);

  try {
    const upstream = await fetchLawyerBackend(
      "/api/sos/lawyer/pickups/check",
      { method: "GET" },
      token,
    );
    if (upstream.status === 401 || upstream.status === 403) {
      return json({ ok: false, error: "UNAUTHORIZED" }, 401);
    }
    if (!upstream.ok) return json({ ok: false, error: "REQUESTS_UNAVAILABLE" }, 502);

    const lists = sanitizeLawyerRequests(await upstream.json().catch(() => null));
    if (!lists) return json({ ok: false, error: "REQUESTS_UNAVAILABLE" }, 502);
    return json({ ok: true, requests: lists }, 200);
  } catch {
    return json({ ok: false, error: "REQUESTS_UNAVAILABLE" }, 502);
  }
}
