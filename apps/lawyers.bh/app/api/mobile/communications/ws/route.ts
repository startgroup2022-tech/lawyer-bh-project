import { experimental_upgradeWebSocket } from "@vercel/functions";
import type { WebSocket } from "ws";

import { attachCommunicationRuntimeSocket } from "@/lib/communications/socket-runtime";

export const runtime = "nodejs";

// This route only works on a runtime that performs the WebSocket upgrade for
// the function, which is why it delegates to `experimental_upgradeWebSocket`.
// A plain `next start` server does not upgrade app-route paths (its upgrade
// handler ends the socket before the handler runs), so self-hosted deployments
// must serve this path through `server.mjs` instead.
export async function GET() {
  return experimental_upgradeWebSocket((ws: WebSocket) => {
    attachCommunicationRuntimeSocket(ws);
  }, { maxPayload: 70_000 });
}
