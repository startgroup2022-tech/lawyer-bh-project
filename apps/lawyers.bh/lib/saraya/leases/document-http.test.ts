import { describe, expect, it } from "vitest";
import { createGetLeaseDocumentRoute } from "./document-http";

describe("lease document HTTP", () => {
  it("streams private bytes with safe headers and no redirect", async () => {
    const route = createGetLeaseDocumentRoute({
      authenticate: async () => ({ userId: "tenant", sessionId: "s", propertyIds: [], memberships: [] }),
      download: async () => ({ bytes: new Uint8Array([37, 80, 68, 70]), contentType: "application/pdf", fileName: "lease.pdf" }),
    });
    const response = await route(new Request("https://sq.example/api/lease/document"), { params: Promise.resolve({ id: "lease-1" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([37, 80, 68, 70]));
  });
});
