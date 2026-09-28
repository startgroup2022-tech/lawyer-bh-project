// POST /api/mobile/evidence/finalize
// Header: Authorization: Bearer <accessJwt>
// Body: { caseId, storageKey, caption?, sha256? }
// Returns: { ok: true, evidenceId, sizeBytes, mimeType }
//
// Call AFTER the direct R2 PUT succeeds. We HEAD the object to confirm
// + insert the evidence_files row.

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAccessJwt } from "@/lib/auth/mobile-jwt";
import { finalizeUpload } from "@/lib/services/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  caseId: z.string().uuid(),
  storageKey: z.string().min(1).max(500),
  caption: z.string().max(500).optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
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

  // Attribute the upload to the JWT subject — clients can't claim
  // someone else uploaded it.
  const uploadedByUserId = claims.role === "client" ? claims.sub : null;
  const uploadedByLawyerId = claims.role === "lawyer" ? claims.sub : null;

  const result = await finalizeUpload({
    ...payload,
    uploadedByUserId,
    uploadedByLawyerId,
  });
  if (!result.ok) {
    const status =
      result.code === "case_not_found"
        ? 404
        : result.code === "not_uploaded"
          ? 422
          : 400;
    return NextResponse.json(
      { error: result.code, message: result.message },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    evidenceId: result.evidenceId,
    sizeBytes: result.sizeBytes,
    mimeType: result.mimeType,
  });
}
