import { describe, expect, it } from "vitest";
import { createRentalRequestDocumentRoute } from "./request-document-http";

describe("rental request document route", () => {
  it("returns authenticated private bytes with hardened headers", async () => {
    const route = createRentalRequestDocumentRoute({
      authenticate: async () => ({ userId: "user", sessionId: "s", propertyIds: ["property"], memberships: [] }),
      download: async (_principal, propertyId, requestId, kind) => {
        expect({ propertyId, requestId, kind }).toEqual({ propertyId: "property-1", requestId: "request-1", kind: "identity" });
        return { bytes: Uint8Array.from([37, 80, 68, 70]), fileName: "identity.pdf", contentType: "application/pdf" };
      },
    });
    const response = await route(new Request("https://sq.test/api?propertyId=property-1"), { params: Promise.resolve({ requestId: "request-1", kind: "identity" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toContain("identity.pdf");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(Uint8Array.from([37, 80, 68, 70]));
  });

  it("rejects an unknown document kind before download", async () => {
    let downloaded = false;
    const route = createRentalRequestDocumentRoute({
      authenticate: async () => ({ userId: "user", sessionId: "s", propertyIds: ["property"], memberships: [] }),
      download: async () => { downloaded = true; throw new Error("not expected"); },
    });
    const response = await route(new Request("https://sq.test/api?propertyId=property-1"), { params: Promise.resolve({ requestId: "request-1", kind: "lease" }) });
    expect(response.status).toBe(422);
    expect(downloaded).toBe(false);
  });
});
