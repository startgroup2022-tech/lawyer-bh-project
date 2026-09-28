import { describe, expect, it } from "vitest";
import { readPaymentJson } from "./body";

describe("bounded payment JSON", () => {
  it("accepts a small body without Content-Length", async () => {
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode('{"ok":true}')); controller.close(); } });
    await expect(readPaymentJson(new Request("https://example.test", { method: "POST", headers: { "content-type": "application/json" }, body: stream, duplex: "half" } as RequestInit))).resolves.toEqual({ ok: true });
  });

  it("rejects an oversized declared body before reading", async () => {
    await expect(readPaymentJson(new Request("https://example.test", { method: "POST", headers: { "content-length": "20000" }, body: "{}" })))
      .rejects.toMatchObject({ status: 413, code: "PAYMENT_BODY_TOO_LARGE" });
  });

  it("rejects an oversized chunked stream without Content-Length", async () => {
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(9000)); controller.enqueue(new Uint8Array(9000)); controller.close(); } });
    await expect(readPaymentJson(new Request("https://example.test", { method: "POST", body: stream, duplex: "half" } as RequestInit)))
      .rejects.toMatchObject({ status: 413, code: "PAYMENT_BODY_TOO_LARGE" });
  });
});
