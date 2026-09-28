import { describe, expect, it } from "vitest";
import { createSocketTicketCodec } from "./socket-ticket";

const secret = "a".repeat(32);
const issuedAt = new Date("2026-08-25T10:00:00.000Z");
const codec = createSocketTicketCodec({ secret, now: () => issuedAt, ttlSeconds: 60 });

describe("communication socket ticket", () => {
  it("round trips only the request-scoped actor identity", () => {
    const token = codec.issue({ requestId: "request-1", actorRole: "client", actorId: "client-1" });
    expect(codec.verify(token)).toEqual({ requestId: "request-1", actorRole: "client", actorId: "client-1", expiresAt: new Date("2026-08-25T10:01:00.000Z") });
    expect(token).not.toContain("client-1");
  });

  it("rejects tampering", () => {
    const token = codec.issue({ requestId: "request-1", actorRole: "lawyer", actorId: "lawyer-1" });
    expect(codec.verify(`${token.slice(0, -1)}x`)).toBeNull();
  });

  it("rejects expiry", () => {
    const token = codec.issue({ requestId: "request-1", actorRole: "client", actorId: "client-1" });
    const later = createSocketTicketCodec({ secret, now: () => new Date("2026-08-25T10:01:01.000Z"), ttlSeconds: 60 });
    expect(later.verify(token)).toBeNull();
  });

  it("rejects an unsafe secret", () => {
    expect(() => createSocketTicketCodec({ secret: "short", now: () => issuedAt })).toThrow("secret");
  });
});
