import { NextResponse } from "next/server";

import { getMobileLawyerSession, type MobileLawyerSession } from "@/lib/mobile-lawyer-auth";

export function lawyerJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Rejects cross-origin mutations, matching the rest of the mobile API. */
export function rejectCrossOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return lawyerJson({ ok: false, error: "forbidden" }, 403);
  }
  return null;
}

/** The authenticated lawyer session, or a ready-to-return 401 response. */
export async function requireMobileLawyer(
  request: Request,
): Promise<{ session: MobileLawyerSession } | { response: NextResponse }> {
  const session = await getMobileLawyerSession(request);
  if (!session) return { response: lawyerJson({ ok: false, error: "unauthorized" }, 401) };
  return { session };
}

export async function readLawyerJson(request: Request, maxBytes = 32_768): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("body_too_large");
  return text ? JSON.parse(text) : {};
}
