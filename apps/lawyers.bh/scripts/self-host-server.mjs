// Self-hosted HTTP server for the lawyers.bh app.
//
// `next start` cannot serve the communication WebSocket: Next's built-in
// upgrade handler ends the socket for any path that matches an app route
// before the route handler runs, so `/api/mobile/communications/ws` never
// upgrades. This server runs Next's request handler as usual and takes over
// that single path's upgrade itself, delegating to the same socket runtime the
// route handler uses.
//
// Built to `server.mjs` by `scripts/build-self-host-server.mjs`; start with
// `node server.mjs`. On a runtime that performs upgrades natively (e.g.
// Vercel) the route handler is used instead and this file is unused.

import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";

const SOCKET_PATH = "/api/mobile/communications/ws";

const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname, port });
await app.prepare();

const handle = app.getRequestHandler();

const server = createServer((req, res) => {
  handle(req, res);
});

const webSocketServer = new WebSocketServer({ noServer: true, maxPayload: 70_000 });

function onUpgrade(req, socket, head) {
  const pathname = (req.url || "").split("?")[0];
  if (pathname !== SOCKET_PATH) {
    // Not ours (Next HMR in dev, or an unknown path).
    socket.destroy();
    return;
  }
  webSocketServer.handleUpgrade(req, socket, head, (ws) => {
    webSocketServer.emit("connection", ws, req);
  });
}

// Next attaches its own 'upgrade' listener lazily while handling the first
// request, and that listener would end the socket before our handler runs.
// Keep only our listener installed; drop any others Next adds.
function claimUpgradeEvents() {
  for (const listener of server.listeners("upgrade")) {
    if (listener !== onUpgrade) server.removeListener("upgrade", listener);
  }
  if (!server.listeners("upgrade").includes(onUpgrade)) server.on("upgrade", onUpgrade);
}

claimUpgradeEvents();
server.on("request", claimUpgradeEvents);

webSocketServer.on("connection", async (ws) => {
  const { attachCommunicationRuntimeSocket } = await import("./build/self-host/socket-runtime.mjs");
  try {
    attachCommunicationRuntimeSocket(ws);
  } catch (error) {
    console.error("communication_socket_attach_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    ws.close(1011, "socket_unavailable");
  }
});

server.listen(port, hostname, () => {
  console.log(`▲ lawyers.bh self-host server ready on http://${hostname}:${port}`);
});
