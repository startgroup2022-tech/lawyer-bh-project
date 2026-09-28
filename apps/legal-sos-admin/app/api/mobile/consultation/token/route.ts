// POST /api/mobile/consultation/token
// Header: Authorization: Bearer <accessJwt>
// Body: { caseId }
// Returns: { ok: true, appId, channelName, uid, token, expiresAt }
//
// Mobile passes the {appId, channelName, uid, token} to the Agora SDK
// (RtcEngine.joinChannel) to start the call. Both client + lawyer hit
// this endpoint with the same caseId — they get the same channelName
// but different uids.

import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { verifyAccessJwt } from "@/lib/auth/mobile-jwt";
import {
  generateRtcToken,
  consultationChannelName,
  uidFromString,
  isAgoraConfigured,
} from "@/lib/agora";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  caseId: z.string().uuid(),
});

export async function POST(req: Request) {
  if (!isAgoraConfigured()) {
    return NextResponse.json(
      { error: "agora_not_configured", message: "Voice/video not configured." },
      { status: 503 },
    );
  }

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

  // Confirm the case exists. Authorization (this user is on this case)
  // gets stricter once the cases router lands — for now any authenticated
  // mobile user can join a consultation by caseId. TODO(phase-A): verify
  // claim.sub === case.clientUserId OR claim.sub === case.assignedLawyerId.
  const [caseRow] = await db
    .select({ id: schema.cases.id, caseRef: schema.cases.caseRef })
    .from(schema.cases)
    .where(eq(schema.cases.id, payload.caseId))
    .limit(1);
  if (!caseRow) {
    return NextResponse.json(
      { error: "case_not_found" },
      { status: 404 },
    );
  }

  const channelName = consultationChannelName(payload.caseId);
  const uid = uidFromString(claims.sub);
  const result = generateRtcToken({
    channelName,
    uid,
    expirationMinutes: 20, // 15-min call + 5-min buffer
    role: "publisher",
  });

  // Audit so we can prove who joined what room and when.
  await db.insert(schema.auditLog).values({
    actorUserId: claims.sub,
    action: "consultation.token.issue",
    targetType: "case",
    targetId: payload.caseId,
    meta: { channelName, uid, role: claims.role },
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  });

  return NextResponse.json({
    ok: true,
    appId: result.appId,
    channelName: result.channelName,
    uid: result.uid,
    token: result.token,
    expiresAt: result.expiresAt,
  });
}
