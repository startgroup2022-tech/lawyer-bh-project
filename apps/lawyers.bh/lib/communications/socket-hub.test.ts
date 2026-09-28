import { describe, expect, it, vi } from "vitest";
import { createSocketHub } from "./socket-hub";

describe("communication socket hub", () => {
  it("delivers only to the peer in the same request", () => {
    const hub = createSocketHub();
    const client = vi.fn(); const lawyer = vi.fn(); const outsider = vi.fn();
    hub.register({ requestId: "request-1", actorRole: "client", actorId: "client-1", send: client });
    hub.register({ requestId: "request-1", actorRole: "lawyer", actorId: "lawyer-1", send: lawyer });
    hub.register({ requestId: "request-2", actorRole: "lawyer", actorId: "lawyer-2", send: outsider });
    hub.deliver({ requestId: "request-1", senderRole: "client", event: { type: "signal.offer", callId: "call-1", sdp: "v=0" } });
    expect(lawyer).toHaveBeenCalledOnce();
    expect(client).not.toHaveBeenCalled();
    expect(outsider).not.toHaveBeenCalled();
  });

  it("stops delivery after unregister", () => {
    const hub = createSocketHub(); const send = vi.fn();
    const unregister = hub.register({ requestId: "request-1", actorRole: "lawyer", actorId: "lawyer-1", send });
    unregister();
    hub.deliver({ requestId: "request-1", senderRole: "client", event: { type: "ping" } });
    expect(send).not.toHaveBeenCalled();
  });
});
