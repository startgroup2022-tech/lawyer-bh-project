import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  participant: null as null | { requestId: string; actor: { role: "client" | "lawyer"; id: string }; peer: { role: "client" | "lawyer"; id: string; displayName: string; phone: string | null }; capabilities: { read: true; send: boolean; call: boolean } },
  rows: [] as Record<string, unknown>[],
  sql: vi.fn(async (..._args: unknown[]) => mocks.rows),
  sendLawyerPush: vi.fn(async () => ({ sent: 1, failed: 0, pruned: 0 })),
  sendClientPush: vi.fn(async () => ({ sent: 1, failed: 0, pruned: 0 })),
  safety: { blockedByMe: false, blockedByPeer: false, chatSuspendedUntil: null as string | null },
}));
vi.mock("@/lib/communications/server-access", () => ({ resolveRequestCommunicationAccess: vi.fn(async () => mocks.participant) }));
vi.mock("@/lib/communications/safety/store", () => ({ getCommunicationSafetyState: vi.fn(async () => mocks.safety) }));
vi.mock("@/lib/db/client", () => ({ sqlClient: mocks.sql }));
vi.mock("@/lib/sos/mobile-push", () => ({ mobilePushSender: vi.fn(async () => ({ sendLawyerPush: mocks.sendLawyerPush, sendClientPush: mocks.sendClientPush })) }));

import { GET, POST } from "./route";

const requestId = "8d983269-123f-49a8-9b62-ccaa7a4e496e";
const context = { params: Promise.resolve({ requestId }) };
const participant = { requestId, actor: { role: "client" as const, id: `client:${requestId}` }, peer: { role: "lawyer" as const, id: "lawyer-1", displayName: "Lawyer", phone: null }, capabilities: { read: true as const, send: true, call: true } };

describe("communication messages route", () => {
  it('returns downloadable attachment metadata without exposing file bytes', async () => {
    mocks.rows = [{id:'message-1', sender_role:'lawyer', body:'case.pdf', created_at:new Date('2026-09-09T10:00:00Z'), read_at:null,
      attachment:{id:'11111111-1111-4111-8111-111111111111',name:'case.pdf',size:123,mime:'application/pdf'}, content:'private'}];
    const response=await GET(new Request(`https://lawyers.bh/api/mobile/communications/${requestId}/messages`),context);
    const body=await response.json();
    expect(body.messages[0].attachment).toEqual({id:'11111111-1111-4111-8111-111111111111',name:'case.pdf',size:123,mime:'application/pdf'});
    expect(body.messages[0]).not.toHaveProperty('content');
  });
  beforeEach(() => { vi.clearAllMocks(); mocks.participant = participant; mocks.rows = []; mocks.safety = { blockedByMe: false, blockedByPeer: false, chatSuspendedUntil: null }; });

  it("rejects non-participants", async () => {
    mocks.participant = null;
    const response = await GET(new Request(`https://lawyers.bh/api/mobile/communications/${requestId}/messages`), context);
    expect(response.status).toBe(403);
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("persists server-derived sender identity and ignores spoof fields", async () => {
    mocks.rows = [{ id: "message-1", request_id: requestId, sender_role: "client", sender_id: `client:${requestId}`, client_message_id: "11111111-1111-4111-8111-111111111111", body: "Hello", created_at: new Date("2026-08-25T10:00:00Z"), read_at: null, inserted: true }];
    const response = await POST(new Request(`https://lawyers.bh/api/mobile/communications/${requestId}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientMessageId: "11111111-1111-4111-8111-111111111111", body: " Hello ", senderRole: "lawyer", senderId: "attacker" }) }), context);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.message).toMatchObject({ senderRole: "client", body: "Hello" });
    const query = mocks.sql.mock.calls[0]?.[0] as TemplateStringsArray;
    expect(query.join(" ")).toContain("ON CONFLICT");
    expect(mocks.sendLawyerPush).toHaveBeenCalledWith({ lawyerId: "lawyer-1", eventType: "new_message", requestId, locale: "ar" });
    expect(mocks.sendClientPush).not.toHaveBeenCalled();
  });

  it("notifies the client when a lawyer stores a new message", async () => {
    mocks.participant = { ...participant, actor: { role: "lawyer", id: "lawyer-1" }, peer: { role: "client", id: `client:${requestId}`, displayName: "Client", phone: null } };
    mocks.rows = [{ id: "message-2", request_id: requestId, sender_role: "lawyer", sender_id: "lawyer-1", client_message_id: "22222222-2222-4222-8222-222222222222", body: "Reply", created_at: new Date("2026-08-25T10:01:00Z"), read_at: null, inserted: true }];
    const response = await POST(new Request(`https://lawyers.bh/api/mobile/communications/${requestId}/messages`, { method: "POST", body: JSON.stringify({ clientMessageId: "22222222-2222-4222-8222-222222222222", body: "Reply" }) }), context);
    expect(response.status).toBe(201);
    expect(mocks.sendClientPush).toHaveBeenCalledWith({ eventType: "new_message", requestId, locale: "ar" });
    expect(mocks.sendLawyerPush).not.toHaveBeenCalled();
  });

  it("does not send a second push for an idempotent duplicate", async () => {
    mocks.rows = [{ id: "message-1", request_id: requestId, sender_role: "client", body: "Hello", created_at: new Date("2026-08-25T10:00:00Z"), read_at: null, inserted: false }];
    await POST(new Request(`https://lawyers.bh/api/mobile/communications/${requestId}/messages`, { method: "POST", body: JSON.stringify({ clientMessageId: "11111111-1111-4111-8111-111111111111", body: "Hello" }) }), context);
    expect(mocks.sendLawyerPush).not.toHaveBeenCalled();
    expect(mocks.sendClientPush).not.toHaveBeenCalled();
  });

  it("blocks sending when the request is completed", async () => {
    mocks.participant = { ...participant, capabilities: { read: true, send: false, call: false } };
    const response = await POST(new Request(`https://lawyers.bh/api/mobile/communications/${requestId}/messages`, { method: "POST", body: "{}" }), context);
    expect(response.status).toBe(409);
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("blocks personal messages while keeping history readable", async () => {
    mocks.safety.blockedByPeer = true;
    const sendResponse = await POST(new Request(`https://lawyers.bh/api/mobile/communications/${requestId}/messages`, { method: "POST", body: "{}" }), context);
    expect(sendResponse.status).toBe(409);
    expect(await sendResponse.json()).toEqual({ error: "communication_blocked" });

    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{ unread_count: 0 }]);
    const historyResponse = await GET(new Request(`https://lawyers.bh/api/mobile/communications/${requestId}/messages`), context);
    expect(historyResponse.status).toBe(200);
    expect((await historyResponse.json()).safety.capabilities.read).toBe(true);
  });

  it("returns chat_suspended while an administrative suspension is active", async () => {
    mocks.safety.chatSuspendedUntil = "2099-01-01T00:00:00.000Z";
    const response = await POST(new Request(`https://lawyers.bh/api/mobile/communications/${requestId}/messages`, { method: "POST", body: "{}" }), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "chat_suspended" });
  });

  it("returns canonical history without private sender ids", async () => {
    mocks.rows = [{ id: "message-1", sender_role: "lawyer", body: "Update", created_at: new Date("2026-08-25T10:00:00Z"), read_at: null }];
    const response = await GET(new Request(`https://lawyers.bh/api/mobile/communications/${requestId}/messages?limit=20`), context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.messages).toEqual([{ id: "message-1", senderRole: "lawyer", body: "Update", createdAt: "2026-08-25T10:00:00.000Z", readAt: null }]);
  });
  it('returns server unread count and current send permission for both roles',async()=>{
    for(const role of ['client','lawyer'] as const){
      mocks.participant={...participant,actor:{role,id:role},capabilities:{read:true,send:false,call:false}};
      mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{unread_count:6}]);
      const response=await GET(new Request(`https://lawyers.bh/api/mobile/communications/${requestId}/messages`),context);
      const body=await response.json();
      expect(body.unreadCount).toBe(6);
      expect(body.capabilities.send).toBe(false);
    }
  });
});
