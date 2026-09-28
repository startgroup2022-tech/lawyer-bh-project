import { describe, expect, it } from "vitest";
import { createEscalatedRequestsHttp } from "./escalated-requests-http";

describe("mobile admin escalated queue HTTP", () => {
  it("rejects a client or lawyer token before reading case data", async () => {
    let reads = 0;
    const handler = createEscalatedRequestsHttp({
      authorize: async () => null,
      list: async () => { reads++; return { requests: [], nextCursor: null }; },
    });
    const response = await handler(new Request("https://lawyers.bh/api/mobile/admin/escalated-requests"));
    expect(response.status).toBe(401);
    expect(reads).toBe(0);
  });

  it("returns a bounded server-owned queue with no-store headers", async () => {
    const handler = createEscalatedRequestsHttp({
      authorize: async () => ({ id: "admin-1" }),
      list: async () => ({ requests: [{ id: "request-1", caseRef: "SOS-1" }], nextCursor: null }),
    });
    const response = await handler(new Request("https://lawyers.bh/api/mobile/admin/escalated-requests"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, requests: [{ id: "request-1", caseRef: "SOS-1" }], nextCursor: null });
  });

  it("rejects a malformed pagination cursor before querying", async () => {
    let reads = 0;
    const handler = createEscalatedRequestsHttp({
      authorize: async () => ({ id: "admin-1" }),
      list: async () => { reads++; return { requests: [], nextCursor: null }; },
    });
    const response = await handler(new Request("https://lawyers.bh/api/mobile/admin/escalated-requests?cursor=garbage"));
    expect(response.status).toBe(400);
    expect(reads).toBe(0);
  });
});
