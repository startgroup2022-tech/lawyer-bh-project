import type { WebSocket } from "ws";

import { attachAppointmentSocket } from "@/lib/appointment-communications/socket-runtime";

export const runtime = "nodejs";

/**
 * WebSocket entry point for normal appointment conversations (chat fan-out and
 * voice/video signaling). Served through the self-hosted `server.mjs` upgrade
 * adapter, which recognizes this path.
 */
export async function GET() {
  const { experimental_upgradeWebSocket } = await import("@vercel/functions");
  return experimental_upgradeWebSocket((ws: WebSocket) => {
    attachAppointmentSocket(ws);
  }, { maxPayload: 70_000 });
}
