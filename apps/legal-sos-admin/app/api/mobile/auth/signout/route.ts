// POST /api/mobile/auth/signout
// Header: Authorization: Bearer <accessJwt>
// Body: { refreshToken?: string }
// Revokes the refresh token and writes an audit row.

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAccessJwt } from "@/lib/auth/mobile-jwt";
import { signOutMobile } from "@/lib/services/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  refreshToken: z.string().optional(),
});

export async function POST(req: Request) {
  const authz = req.headers.get("authorization");
  if (!authz || !authz.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "missing_bearer" }, { status: 401 });
  }
  const claims = await verifyAccessJwt(authz.slice(7).trim());
  if (!claims) {
    return NextResponse.json({ error: "invalid_bearer" }, { status: 401 });
  }

  let body: z.infer<typeof Body> = {};
  try {
    const raw = await req.json();
    body = Body.parse(raw);
  } catch {
    // Empty body is fine — signOut is idempotent without refreshToken.
  }

  await signOutMobile(
    claims.sub,
    body.refreshToken ?? null,
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    req.headers.get("user-agent") ?? null,
  );

  return NextResponse.json({ ok: true });
}
