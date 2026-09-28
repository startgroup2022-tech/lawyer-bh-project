import { communicationCallPushStore } from "@/lib/communications/call-push-store";
import { resolveRequestCommunicationAccess } from "@/lib/communications/server-access";

type Context = { params: Promise<{ requestId: string }> };

export async function PUT(request: Request, context: Context) {
  const { requestId } = await context.params;
  const participant = await resolveRequestCommunicationAccess(requestId, request);
  if (!participant) return Response.json({ error: "communication_forbidden" }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const locale = body.locale === "en" || body.locale === "tr" ? body.locale : "ar";
  if (
    body.platform !== "ios" ||
    body.tokenType !== "voip" ||
    typeof body.token !== "string" ||
    !/^[a-f0-9]{64}$/i.test(body.token.trim())
  ) {
    return Response.json({ error: "invalid_call_push_registration" }, { status: 400 });
  }
  await communicationCallPushStore.register({
    requestId,
    actorRole: participant.actor.role,
    actorId: participant.actor.id,
    platform: "ios",
    tokenType: "voip",
    token: body.token,
    locale,
  });
  return new Response(null, { status: 204 });
}
