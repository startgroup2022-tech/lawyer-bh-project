import { describe, expect, it } from "vitest";
import { createRentalStatusHandler } from "./status-http";

describe("rental status HTTP contract", () => {
  it("returns the authenticated privacy-safe JSON contract", async () => {
    const handler = createRentalStatusHandler({
      authenticate: async () => ({ userId: "tenant", sessionId: "s", propertyIds: [], memberships: [] }),
      read: async (_principal, requestId) => ({ id: requestId, requestId, status: "pending_owner_review", timeline: [] }),
    });
    const response = await handler(new Request("https://sq.example/api/status"), "55555555-5555-4555-8555-555555555555");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "55555555-5555-4555-8555-555555555555",
      requestId: "55555555-5555-4555-8555-555555555555",
      status: "pending_owner_review",
      timeline: [],
    });
  });
});
