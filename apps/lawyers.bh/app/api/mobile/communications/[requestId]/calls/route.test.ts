import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  participant: null as null | {
    actor: { role: "client" | "lawyer"; id: string };
    peer: { role: "client" | "lawyer"; id: string; displayName: string };
    capabilities: { call: boolean };
  },
  rows: [] as Record<string, unknown>[],
  sql: vi.fn(async (..._args: unknown[]) => mocks.rows),
  sendLawyerPush: vi.fn(async () => ({ sent: 1, failed: 0, pruned: 0 })),
  sendClientPush: vi.fn(async () => ({ sent: 1, failed: 0, pruned: 0 })),
  sendPeerVoipPush: vi.fn(async () => ({ sent: 1, failed: 0 })),
  safety: { blockedByMe: false, blockedByPeer: false, chatSuspendedUntil: null as string | null },
}));
vi.mock("@/lib/communications/server-access", () => ({ resolveRequestCommunicationAccess: vi.fn(async () => mocks.participant) }));
vi.mock("@/lib/communications/safety/store", () => ({ getCommunicationSafetyState: vi.fn(async () => mocks.safety) }));
vi.mock("@/lib/db/client", () => ({ sqlClient: mocks.sql }));
vi.mock("@/lib/sos/mobile-push", () => ({
  mobilePushSender: vi.fn(async () => ({
    sendLawyerPush: mocks.sendLawyerPush,
    sendClientPush: mocks.sendClientPush,
  })),
}));
vi.mock("@/lib/communications/voip-push", () => ({
  sendPeerVoipPush: mocks.sendPeerVoipPush,
}));
import { POST } from "./route";

const requestId = "8d983269-123f-49a8-9b62-ccaa7a4e496e";
const context = { params: Promise.resolve({ requestId }) };
describe("create communication call", () => {
  it.each(['client', 'lawyer'] as const)('serializes database timestamp strings for %s calls', async (role) => {
    mocks.participant = { actor: { role, id: 'actor' }, peer: { role: role === 'client' ? 'lawyer' : 'client', id: 'peer', displayName: 'Peer' }, capabilities: { call: true } };
    mocks.rows = [{ id: 'call-1', media_kind: 'audio', status: 'ringing', ringing_at: '2026-09-10T13:09:23.750+03:00' }];
    const response = await POST(new Request('https://lawyers.bh', { method: 'POST', body: JSON.stringify({ mediaKind: 'audio' }) }), context);
    expect(response.status).toBe(201);
    expect((await response.json()).call.ringingAt).toBe('2026-09-10T10:09:23.750Z');
  });
  it('still attempts FCM delivery when VoIP delivery fails', async()=>{
    mocks.participant={actor:{role:'client',id:'client'},peer:{role:'lawyer',id:'lawyer-1',displayName:'Lawyer'},capabilities:{call:true}};
    mocks.rows=[{id:'call-1',media_kind:'audio',status:'ringing',ringing_at:new Date()}];
    mocks.sendPeerVoipPush.mockRejectedValueOnce(new Error('APNs unreachable'));
    expect((await POST(new Request('https://lawyers.bh',{method:'POST',body:JSON.stringify({mediaKind:'audio'})}),context)).status).toBe(201);
    expect(mocks.sendLawyerPush).toHaveBeenCalled();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.participant = {
      actor: { role: "client", id: `client:${requestId}` },
      peer: { role: "lawyer", id: "lawyer-1", displayName: "Lawyer" },
      capabilities: { call: true },
    };
    mocks.rows = [];
    mocks.safety = { blockedByMe: false, blockedByPeer: false, chatSuspendedUntil: null };
  });
  it("creates a ringing call using server actor identity", async () => {
    mocks.rows = [{ id: "call-1", media_kind: "video", status: "ringing", ringing_at: new Date("2026-08-25T10:00:00Z") }];
    const response = await POST(new Request("https://lawyers.bh", { method: "POST", body: JSON.stringify({ mediaKind: "video", initiatorId: "attacker" }) }), context);
    expect(response.status).toBe(201);
    expect(mocks.sql).toHaveBeenCalledTimes(2);
    expect(await response.json()).toEqual({ call: { id: "call-1", mediaKind: "video", status: "ringing", ringingAt: "2026-08-25T10:00:00.000Z" } });
    expect(mocks.sendLawyerPush).toHaveBeenCalledWith({
      eventType: "incoming_call",
      requestId,
      callId: "call-1",
      mediaKind: "video",
      callerName: "LegalSOS",
      lawyerId: "lawyer-1",
      locale: "ar",
    });
    expect(mocks.sendPeerVoipPush).toHaveBeenCalledWith({
      requestId,
      actorRole: "lawyer",
      actorId: "lawyer-1",
      callId: "call-1",
      mediaKind: "video",
      callerName: "LegalSOS",
    });
  });

  it("pushes an incoming call to the client when the lawyer calls", async () => {
    mocks.participant = {
      actor: { role: "lawyer", id: "lawyer-1" },
      peer: { role: "client", id: "client-1", displayName: "Client" },
      capabilities: { call: true },
    };
    mocks.rows = [{ id: "call-1", media_kind: "audio", status: "ringing", ringing_at: new Date("2026-08-25T10:00:00Z") }];

    const response = await POST(new Request("https://lawyers.bh", { method: "POST", body: JSON.stringify({ mediaKind: "audio" }) }), context);

    expect(response.status).toBe(201);
    expect(mocks.sendClientPush).toHaveBeenCalledWith({
      eventType: "incoming_call",
      requestId,
      callId: "call-1",
      mediaKind: "audio",
      callerName: "LegalSOS",
      locale: "ar",
    });
  });
  it("blocks calls on read-only requests", async () => {
    mocks.participant = { actor: { role: "client", id: "client-1" }, peer: { role: "lawyer", id: "lawyer-1", displayName: "Lawyer" }, capabilities: { call: false } };
    const response = await POST(new Request("https://lawyers.bh", { method: "POST", body: "{}" }), context);
    expect(response.status).toBe(409);
  });
  it("rejects invalid media kind", async () => {
    const response = await POST(new Request("https://lawyers.bh", { method: "POST", body: JSON.stringify({ mediaKind: "screen" }) }), context);
    expect(response.status).toBe(400);
  });
  it("blocks calls when either participant has blocked the other", async () => {
    mocks.safety.blockedByPeer = true;
    const response = await POST(new Request("https://lawyers.bh", { method: "POST", body: JSON.stringify({ mediaKind: "audio" }) }), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "communication_blocked" });
    expect(mocks.sql).not.toHaveBeenCalled();
  });
});
