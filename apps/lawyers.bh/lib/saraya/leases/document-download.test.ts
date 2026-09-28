import { describe, expect, it } from "vitest";
import { createLeaseDocumentDownload } from "./document-download";

describe("lease document download", () => {
  it("returns authenticated PDF bytes instead of a bearerless redirect", async () => {
    const download = createLeaseDocumentDownload({
      find: async () => ({ propertyId: "property", tenantUserId: "tenant", ownerId: null, storageKey: "private/lease.pdf", originalName: "lease.pdf" }),
      read: async () => new Uint8Array([37, 80, 68, 70]),
    });
    await expect(download({ userId: "tenant", sessionId: "s", propertyIds: [], memberships: [] }, "lease", false)).resolves.toMatchObject({ bytes: new Uint8Array([37, 80, 68, 70]), contentType: "application/pdf", fileName: "lease.pdf" });
  });
});
