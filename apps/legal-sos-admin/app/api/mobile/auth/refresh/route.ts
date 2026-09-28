// POST /api/mobile/auth/refresh
// Body: { refreshToken: string }
// On success: { ok: true, accessJwt, refreshToken, userId, role }
//
// Rolling refresh token: every call invalidates the old token and
// issues a new one. Clients MUST persist the new refresh token.

import { NextResponse } from "next/server";
import { z } from "zod";
import { refresh } from "@/lib/services/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  refreshToken: z.string().min(20).max(200),
});

export async function POST(req: Request) {
  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const result = await refresh(payload.refreshToken);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.code, message: result.message },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    accessJwt: result.accessJwt,
    refreshToken: result.refreshToken,
    userId: result.userId,
    role: result.role,
  });
}
