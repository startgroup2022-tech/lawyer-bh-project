import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  participant: null as null | {
    actor: { role: "client" | "lawyer"; id: string };
  },
  register: vi.fn(async () => undefined),
}));

vi.mock("@/lib/communications/server-access", () => ({
  resolveRequestCommunicationAccess: vi.fn(async () => mocks.participant),
}));
vi.mock("@/lib/communications/call-push-store", () => ({
  communicationCallPushStore: { register: mocks.register },
}));

import { PUT } from "./route";

const requestId = "8d983269-123f-49a8-9b62-ccaa7a4e496e";
const context = { params: Promise.resolve({ requestId }) };

function request(body: Record<string, unknown>) {
  return new Request("https://lawyers.bh", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("communication call push registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.participant = { actor: { role: "client", id: `client:${requestId}` } };
  });

  it("registers an authenticated iOS VoIP token for the server-owned actor", async () => {
    const token = "a".repeat(64);
    const response = await PUT(request({ platform: "ios", tokenType: "voip", token, locale: "ar", actorId: "attacker" }), context);

    expect(response.status).toBe(204);
    expect(mocks.register).toHaveBeenCalledWith({
      requestId,
      actorRole: "client",
      actorId: `client:${requestId}`,
      platform: "ios",
      tokenType: "voip",
      token,
      locale: "ar",
    });
  });

  it("rejects missing access and malformed VoIP tokens", async () => {
    mocks.participant = null;
    expect((await PUT(request({ platform: "ios", tokenType: "voip", token: "a".repeat(64), locale: "ar" }), context)).status).toBe(403);
    mocks.participant = { actor: { role: "lawyer", id: "lawyer-1" } };
    expect((await PUT(request({ platform: "ios", tokenType: "voip", token: "not-a-token", locale: "ar" }), context)).status).toBe(400);
    expect(mocks.register).not.toHaveBeenCalled();
  });
});
