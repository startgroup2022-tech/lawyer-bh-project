import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ processInboundMessage: vi.fn() }));
vi.mock("@/lib/whatsapp/runtime", () => ({ processInboundMessage: mocks.processInboundMessage }));

import { GET, POST } from "./route";

const payload = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{ changes: [{ field: "messages", value: {
    metadata: { phone_number_id: "phone-1" },
    messages: [{ id: "wamid.1", from: "97336000000", type: "text", text: { body: "مرحبا" } }],
  } }] }],
});

function post(signature: string | null) {
  return new Request("https://example.test/api/whatsapp/webhook", {
    method: "POST",
    body: payload,
    headers: signature ? { "x-hub-signature-256": signature } : {},
  });
}

describe("WhatsApp webhook route", () => {
  beforeEach(() => {
    vi.stubEnv("META_WHATSAPP_VERIFY_TOKEN", "verify-me");
    vi.stubEnv("META_WHATSAPP_APP_SECRET", "app-secret");
    mocks.processInboundMessage.mockResolvedValue(undefined);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns Meta's challenge only for the configured verification token", async () => {
    const good = await GET(new Request("https://example.test/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=123"));
    expect(good.status).toBe(200);
    expect(await good.text()).toBe("123");

    const bad = await GET(new Request("https://example.test/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123"));
    expect(bad.status).toBe(403);
  });

  it("rejects an invalid signature before processing", async () => {
    const response = await POST(post("sha256=bad"));
    expect(response.status).toBe(401);
    expect(mocks.processInboundMessage).not.toHaveBeenCalled();
  });

  it("processes each normalized message from a valid signed body", async () => {
    const signature = `sha256=${createHmac("sha256", "app-secret").update(payload).digest("hex")}`;
    const response = await POST(post(signature));
    expect(response.status).toBe(200);
    expect(mocks.processInboundMessage).toHaveBeenCalledWith(expect.objectContaining({ messageId: "wamid.1", text: "مرحبا" }));
  });
});
