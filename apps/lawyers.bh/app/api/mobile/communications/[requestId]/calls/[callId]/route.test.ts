import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ participant: null as null | { actor: { role: "client" | "lawyer"; id: string }; capabilities: { call: boolean } }, rows: [] as Record<string, unknown>[], sql: vi.fn(async (..._args: unknown[]) => mocks.rows) }));
vi.mock("@/lib/communications/server-access", () => ({ resolveRequestCommunicationAccess: vi.fn(async () => mocks.participant) }));
vi.mock("@/lib/db/client", () => ({ sqlClient: mocks.sql }));
import { PATCH } from "./route";

const requestId = "8d983269-123f-49a8-9b62-ccaa7a4e496e";
const context = { params: Promise.resolve({ requestId, callId: "11111111-1111-4111-8111-111111111111" }) };
describe("transition communication call", () => {
  it.each(['accept', 'connect'])('blocks %s after request completion', async (action) => {
    mocks.participant!.capabilities.call = false;
    const response = await PATCH(new Request('https://lawyers.bh', { method: 'PATCH', body: JSON.stringify({action}) }), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({error: 'communication_read_only'});
    expect(mocks.sql).not.toHaveBeenCalled();
  });
  it('still allows ending an existing call after completion', async () => {
    mocks.participant!.capabilities.call = false;
    mocks.rows = [{id:'11111111-1111-4111-8111-111111111111', media_kind:'audio',status:'ended',ringing_at:'2026-09-10T10:00:00Z',accepted_at:null,connected_at:null,ended_at:'2026-09-10T10:01:00Z',duration_seconds:0,end_reason:'end',ended_by_role:'lawyer'}];
    const response = await PATCH(new Request('https://lawyers.bh', {method:'PATCH',body:JSON.stringify({action:'end'})}),context);
    expect(response.status).toBe(200);
  });
  it.each(['accept', 'connect', 'end', 'reject', 'cancel', 'fail'])('serializes stored timestamp strings after %s', async (action) => {
    mocks.rows = [{ id: '11111111-1111-4111-8111-111111111111', media_kind: 'audio', status: 'ended', ringing_at: '2026-09-10T10:00:00Z', accepted_at: '2026-09-10T10:00:05Z', connected_at: '2026-09-10T10:00:06Z', ended_at: '2026-09-10T10:01:06Z', duration_seconds: 60, end_reason: 'end', ended_by_role: 'lawyer' }];
    const response = await PATCH(new Request('https://lawyers.bh', { method: 'PATCH', body: JSON.stringify({ action }) }), context);
    expect(response.status).toBe(200);
    expect((await response.json()).call).toMatchObject({ ringingAt: '2026-09-10T10:00:00.000Z', acceptedAt: '2026-09-10T10:00:05.000Z', connectedAt: '2026-09-10T10:00:06.000Z', endedAt: '2026-09-10T10:01:06.000Z', durationSeconds: 60 });
  });
  beforeEach(() => { vi.clearAllMocks(); mocks.participant = { actor: { role: "lawyer", id: "lawyer-1" }, capabilities: { call: true } }; mocks.rows = []; });
  it("atomically accepts a ringing call", async () => {
    mocks.rows = [{ id: "11111111-1111-4111-8111-111111111111", media_kind: "audio", status: "accepted", ringing_at: new Date("2026-08-25T10:00:00Z"), accepted_at: new Date("2026-08-25T10:00:05Z"), connected_at: null, ended_at: null, duration_seconds: null, end_reason: null, ended_by_role: null }];
    const response = await PATCH(new Request("https://lawyers.bh", { method: "PATCH", body: JSON.stringify({ action: "accept" }) }), context);
    expect(response.status).toBe(200);
    expect((await response.json()).call.status).toBe("accepted");
  });
  it("returns conflict for a stale transition", async () => {
    const response = await PATCH(new Request("https://lawyers.bh", { method: "PATCH", body: JSON.stringify({ action: "connect" }) }), context);
    expect(response.status).toBe(409);
  });
});
