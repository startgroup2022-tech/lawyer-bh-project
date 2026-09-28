import { evaluateCommunicationCapabilities } from "@/lib/communications/safety/policy";
import {
  blockCommunicationPeer,
  getCommunicationSafetyState,
  unblockCommunicationPeer,
} from "@/lib/communications/safety/store";
import { resolveRequestCommunicationAccess } from "@/lib/communications/server-access";

type Context = { params: Promise<{ requestId: string }> };

async function participant(request: Request, context: Context) {
  return resolveRequestCommunicationAccess((await context.params).requestId, request);
}

function forbidden() {
  return Response.json({ error: "communication_forbidden" }, { status: 403 });
}

function payload(state: Awaited<ReturnType<typeof getCommunicationSafetyState>>) {
  return {
    safety: {
      ...state,
      capabilities: evaluateCommunicationCapabilities(state),
    },
  };
}

export async function GET(request: Request, context: Context) {
  const access = await participant(request, context);
  if (!access) return forbidden();
  return Response.json(payload(await getCommunicationSafetyState(access)));
}

export async function POST(request: Request, context: Context) {
  const access = await participant(request, context);
  if (!access) return forbidden();
  return Response.json(payload(await blockCommunicationPeer(access)));
}

export async function DELETE(request: Request, context: Context) {
  const access = await participant(request, context);
  if (!access) return forbidden();
  return Response.json(payload(await unblockCommunicationPeer(access)));
}
