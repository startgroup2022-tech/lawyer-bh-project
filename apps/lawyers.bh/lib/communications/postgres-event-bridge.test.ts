import { describe, expect, it, vi } from "vitest";
const database = vi.hoisted(() => {
  const sql = Object.assign(vi.fn(), { json: vi.fn((value: unknown) => value), notify: vi.fn(), listen: vi.fn() });
  return { sql };
});
vi.mock("@/lib/db/client", () => ({ sqlClient: database.sql }));
import { createPostgresEventBridge, postgresCommunicationEventBridge } from "./postgres-event-bridge";

describe("PostgreSQL communication event bridge", () => {
  it('sends serialized JSON at the SQL wire boundary, not an object', async () => {
    database.sql.mockImplementationOnce(async (_strings: TemplateStringsArray, ...parameters: unknown[]) => {
      const json = parameters[2];
      // The transport requires serialized bytes; raw objects cause ERR_INVALID_ARG_TYPE.
      Buffer.byteLength(json as string);
      expect(JSON.parse(json as string)).toEqual({ type: 'signal.offer', callId: 'call-1', sdp: 'v=0\r\n' });
      return [{ id: 'event-1' }];
    });
    await postgresCommunicationEventBridge.publish({ requestId: 'request-1', senderRole: 'client', event: { type: 'signal.offer', callId: 'call-1', sdp: 'v=0\r\n' } });
  });
  it("notifies with only the compact persisted event id", async () => {
    const insert = vi.fn(async () => "event-1"); const notify = vi.fn(async () => undefined);
    const bridge = createPostgresEventBridge({ insert, notify, find: vi.fn(), listen: vi.fn() });
    await bridge.publish({ requestId: "request-1", senderRole: "client", event: { type: "signal.offer", callId: "call-1", sdp: "v=0" } });
    expect(notify).toHaveBeenCalledWith("event-1");
  });

  it("resolves the authoritative unexpired event before delivery", async () => {
    let callback: ((id: string) => void) | undefined;
    const event = { requestId: "request-1", senderRole: "lawyer" as const, event: { type: "signal.answer" as const, callId: "call-1", sdp: "v=0" } };
    const deliver = vi.fn();
    const bridge = createPostgresEventBridge({ insert: vi.fn(), notify: vi.fn(), find: vi.fn(async () => event), listen: vi.fn(async (handler) => { callback = handler; return async () => undefined; }) });
    await bridge.start(deliver); callback?.("event-1"); await vi.waitFor(() => expect(deliver).toHaveBeenCalledWith(event));
  });
});
