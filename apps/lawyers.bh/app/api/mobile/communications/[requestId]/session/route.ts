import { resolveRequestCommunicationAccess } from "@/lib/communications/server-access";
import { createSocketTicketCodec } from "@/lib/communications/socket-ticket";
import { communicationIceServers } from "@/lib/communications/cloudflare-turn";

type Context = { params: Promise<{ requestId: string }> };

function socketSecret() {
  const secret = process.env.COMMUNICATION_SOCKET_SECRET ?? process.env.MOBILE_DISPATCH_SECRET ?? process.env.LAWYER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("COMMUNICATION_SOCKET_SECRET must contain at least 32 characters");
  return secret;
}

export async function POST(request: Request, context: Context) {
  const { requestId } = await context.params;
  const participant = await resolveRequestCommunicationAccess(requestId, request);
  if (!participant) return Response.json({ error: "communication_forbidden" }, { status: 403 });

  const iceServers = participant.capabilities.call ? await communicationIceServers() : [];
  const relayReady = iceServers.some(server =>
    server.username && server.credential && server.urls.some(url => /^turns?:/.test(url)),
  );
  const ticket = createSocketTicketCodec({ secret: socketSecret(), now: () => new Date(), ttlSeconds: 60 }).issue({
    requestId: participant.requestId,
    actorRole: participant.actor.role,
    actorId: participant.actor.id,
  });
  const url = new URL(request.url);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/api/mobile/communications/ws";
  url.search = "";

  return Response.json({
    requestId: participant.requestId,
    ticket,
    webSocketUrl: url.toString(),
    peer: { role: participant.peer.role, displayName: participant.peer.displayName, phone: participant.peer.phone },
    capabilities: { ...participant.capabilities, call: participant.capabilities.call && relayReady },
    iceServers: relayReady ? iceServers : [],
  }, { headers: { "Cache-Control": "no-store" } });
}
