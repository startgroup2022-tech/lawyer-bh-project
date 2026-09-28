import { NextResponse } from "next/server";
import { decideCandidate } from "@/lib/sos/live-dispatch-store";
import { bearerToken, authorizeMobileDispatchToken } from "@/lib/sos/mobile-dispatch-auth";
import { mobilePushSender } from "@/lib/sos/mobile-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  if (!UUID.test(requestId)) return NextResponse.json({ error: "invalid_request_id" }, { status: 400 });
  if (!await authorizeMobileDispatchToken(requestId, bearerToken(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const action = body.action === "approve" || body.action === "skip" ? body.action : null;
  const candidateId = typeof body.candidateId === "string" ? body.candidateId : "";
  if (!action || !UUID.test(candidateId)) return NextResponse.json({ error: "invalid_decision" }, { status: 400 });
  try {
    const result = await decideCandidate({ bookingId: requestId, action, candidateId });
    if (result.approved) {
      try {
        const sender = await mobilePushSender();
        await sender.sendLawyerPush({
          lawyerId: candidateId,
          eventType: "lawyer_offer",
          requestId,
          locale: "ar",
        });
      } catch (pushError) {
        console.warn("[mobile/sos/candidate/decision] push delivery failed", {
          requestId,
          name: pushError instanceof Error ? pushError.name : "UnknownError",
        });
      }
    }
    return NextResponse.json({ approved: result.approved, deadline: result.deadline?.toISOString() ?? null });
  } catch (error) {
    const code = error instanceof Error ? error.message : "decision_failed";
    return NextResponse.json({ error: code }, { status: 409 });
  }
}
