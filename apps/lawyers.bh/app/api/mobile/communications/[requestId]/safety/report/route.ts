import { resolveRequestCommunicationAccess } from "@/lib/communications/server-access";
import { createCommunicationReport } from "@/lib/communications/safety/store";
import { parseCommunicationReport } from "@/lib/communications/safety/validation";

type Context = { params: Promise<{ requestId: string }> };

export async function POST(request: Request, context: Context) {
  const { requestId } = await context.params;
  const participant = await resolveRequestCommunicationAccess(requestId, request);
  if (!participant) {
    return Response.json({ error: "communication_forbidden" }, { status: 403 });
  }

  let input;
  try {
    input = parseCommunicationReport(await request.json());
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_report";
    return Response.json({ error: code }, { status: 400 });
  }

  const report = await createCommunicationReport({
    requestId,
    reporter: { role: participant.actor.role, id: participant.actor.accountId ?? participant.actor.id },
    reported: { role: participant.peer.role, id: participant.peer.accountId ?? participant.peer.id },
    ...input,
  });

  return Response.json({ report }, { status: 201 });
}
