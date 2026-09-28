import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ participant: null as null | Record<string, unknown>, issue: vi.fn(() => "socket-ticket") }));
vi.mock("@/lib/communications/server-access", () => ({ resolveRequestCommunicationAccess: vi.fn(async () => mocks.participant) }));
vi.mock("@/lib/communications/socket-ticket", () => ({ createSocketTicketCodec: vi.fn(() => ({ issue: mocks.issue })) }));

import { POST } from "./route";

const requestId = "8d983269-123f-49a8-9b62-ccaa7a4e496e";
const context = { params: Promise.resolve({ requestId }) };

describe("communication session route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    mocks.participant = null;
    process.env.COMMUNICATION_SOCKET_SECRET = "s".repeat(32);
    delete process.env.CLOUDFLARE_TURN_KEY_ID;
    delete process.env.CLOUDFLARE_TURN_KEY_API_TOKEN;
  });

  it("rejects a non-participant", async () => {
    const response = await POST(new Request("https://lawyers.bh/api/mobile/communications/x/session", { method: "POST" }), context);
    expect(response.status).toBe(403);
    expect(mocks.issue).not.toHaveBeenCalled();
  });

  it("keeps chat available but refuses calling without relay configuration", async () => {
    mocks.participant = { requestId, actor: { role: "client", id: `client:${requestId}` }, peer: { role: "lawyer", id: "lawyer-1", displayName: "Lawyer", phone: "+97339000000" }, capabilities: { read: true, send: true, call: true } };
    const response = await POST(new Request("https://lawyers.bh/api/mobile/communications/x/session", { method: "POST" }), context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ticket: "socket-ticket", requestId, peer: { role: "lawyer", displayName: "Lawyer", phone: "+97339000000" }, capabilities: { read: true, send: true, call: false } });
    expect(JSON.stringify(body)).not.toContain(`client:${requestId}`);
  });

  it("provides short-lived relay credentials to authorized callers", async () => {
    process.env.CLOUDFLARE_TURN_KEY_ID = "turn-key-id";
    process.env.CLOUDFLARE_TURN_KEY_API_TOKEN = "turn-key-token";
    mocks.participant = { requestId, actor: { role: "client", id: `client:${requestId}` }, peer: { role: "lawyer", id: "lawyer-1", displayName: "Lawyer" }, capabilities: { read: true, send: true, call: true } };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      iceServers: [
        { urls: ["stun:stun.cloudflare.com:3478"] },
        { urls: ["turn:turn.cloudflare.com:3478?transport=udp", "turns:turn.cloudflare.com:5349?transport=tcp"], username: "temporary-user", credential: "temporary-password" },
      ],
    }), { status: 201, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(new Request("https://lawyers.bh/api/mobile/communications/x/session", { method: "POST" }), context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.iceServers[1]).toMatchObject({urls:["turn:turn.cloudflare.com:3478?transport=udp", "turns:turn.cloudflare.com:5349?transport=tcp"],username:'temporary-user'});
    expect(body.capabilities.call).toBe(true);
  });
});
