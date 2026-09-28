// POST /api/mobile/evidence/sign-put
// Header: Authorization: Bearer <accessJwt>
// Body: { caseId, fileName, mimeType, sizeBytes }
// Returns: { ok: true, signedUrl, storageKey, expiresAt }
//
// The mobile uploads the file bytes DIRECTLY to R2 using signedUrl —
// no proxy through our server.

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAccessJwt } from "@/lib/auth/mobile-jwt";
import { signPutUrl } from "@/lib/services/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  caseId: z.string().uuid(),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(3).max(128),
  sizeBytes: z.number().int().positive(),
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

  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  const result = await signPutUrl(payload);
  if (!result.ok) {
    const status =
      result.code === "r2_not_configured"
        ? 503
        : result.code === "case_not_found"
          ? 404
          : 400;
    return NextResponse.json(
      { error: result.code, message: result.message },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    signedUrl: result.signedUrl,
    storageKey: result.storageKey,
    expiresAt: result.expiresAt,
  });
}
