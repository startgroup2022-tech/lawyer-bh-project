import { describe, expect, it, vi } from "vitest";
import { createMetaClient } from "./meta-client";

describe("Meta WhatsApp client", () => {
  it("sends a server-rendered message through the configured phone number", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 }));
    const client = createMetaClient({ accessToken: "secret-token", phoneNumberId: "phone-1", graphVersion: "v23.0", fetcher });

    await client.send("97336000000", { type: "text", text: "مرحباً" });

    expect(fetcher).toHaveBeenCalledWith(
      "https://graph.facebook.com/v23.0/phone-1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret-token" }),
      }),
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ messaging_product: "whatsapp", to: "97336000000", type: "text" });
  });

  it("throws a redacted error when Meta rejects the message", async () => {
    const client = createMetaClient({
      accessToken: "do-not-leak",
      phoneNumberId: "phone-1",
      graphVersion: "v23.0",
      fetcher: vi.fn().mockResolvedValue(new Response("token do-not-leak invalid", { status: 401 })),
    });

    await expect(client.send("97336000000", { type: "text", text: "test" }))
      .rejects.toThrow("Meta WhatsApp request failed (401)");
  });
});
