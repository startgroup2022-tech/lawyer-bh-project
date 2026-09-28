import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchLawyerBackend, requireSameOrigin } from "@/lib/lawyer-auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resetSchema = z.object({
  countryCode: z.string().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  identifier: z.string().trim().min(1).max(200),
  locale: z.enum(["ar", "en", "tr"]),
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

  const parsed = resetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: "INVALID_REQUEST" }, 400);

  try {
    const upstream = await fetchLawyerBackend("/api/provider/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countryCode: parsed.data.countryCode,
        identifier: parsed.data.identifier,
        lang: parsed.data.locale === "ar" ? "ar" : "en",
      }),
    });
    if (!upstream.ok) return json({ ok: false, error: "SERVICE_UNAVAILABLE" }, 503);
    return json({ ok: true }, 200);
  } catch {
    return json({ ok: false, error: "SERVICE_UNAVAILABLE" }, 503);
  }
}
