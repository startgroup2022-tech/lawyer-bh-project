import { describe, expect, it } from "vitest";

describe("lease checkout route exports", () => {
  it("exports authenticated signature and document handlers", async () => {
    const signature = await import("@/app/api/saraya/v1/leases/[id]/signature/route");
    const document = await import("@/app/api/saraya/v1/leases/[id]/document/route");
    expect(signature.runtime).toBe("nodejs");
    expect(document.runtime).toBe("nodejs");
    expect(signature.POST).toBeTypeOf("function");
    expect(document.GET).toBeTypeOf("function");
  }, 15_000);

  it.each([undefined, "10"])("rejects a streaming signature body larger than 16KB with Content-Length %s", async (contentLength) => {
    const { readBoundedJson } = await import("./checkout-http");
    const request = new Request("https://example.test", { method: "POST", headers: contentLength ? { "content-length": contentLength } : undefined, body: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(`{\"value\":\"${"x".repeat(20_000)}\"}`)); controller.close(); } }), duplex: "half" } as RequestInit & { duplex: "half" });
    await expect(readBoundedJson(request)).rejects.toMatchObject({ code: "REQUEST_TOO_LARGE" });
  });
});
