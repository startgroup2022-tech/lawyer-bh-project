import { NextResponse } from "next/server";

import { bearerToken } from "@/lib/client-auth/http";
import { clientAuthService } from "@/lib/client-auth/runtime";

export type MobileClient = { id: string; email: string; fullName: string; phone: string };

/** The signed-in client account for a mobile request, or null. */
export async function getMobileClient(request: Request): Promise<MobileClient | null> {
  const token = bearerToken(request);
  if (!token) return null;
  try {
    return await clientAuthService().session(token);
  } catch {
    return null;
  }
}

export function clientJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Rejects cross-origin mutations the way the rest of the mobile API does. */
export function rejectCrossOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return clientJson({ ok: false, error: "forbidden" }, 403);
  }
  return null;
}

export async function readJsonBody(request: Request, maxBytes = 8192): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("body_too_large");
  return text ? JSON.parse(text) : {};
}
