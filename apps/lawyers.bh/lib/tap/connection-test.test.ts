import { describe, expect, it, vi } from "vitest";

import { testTapConnection } from "./connection-test";

describe("testTapConnection", () => {
  it("reports connected when Tap authenticates the key (unknown charge -> 404)", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 404 })) as unknown as typeof fetch;
    const result = await testTapConnection({ environment: "test", secretKey: "sk_test_example", fetchImpl });
    expect(result.status).toBe("connected");
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/v2/charges/"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer sk_test_example" }) }),
    );
  });

  it("reports failed when Tap rejects the key", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 401 })) as unknown as typeof fetch;
    const result = await testTapConnection({ environment: "live", secretKey: "sk_live_bad", fetchImpl });
    expect(result.status).toBe("failed");
    expect(result.message).toContain("401");
  });

  it("reports failed when Tap is unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ENOTFOUND");
    }) as unknown as typeof fetch;
    const result = await testTapConnection({ environment: "test", secretKey: "sk_test_example", fetchImpl });
    expect(result.status).toBe("failed");
    expect(result.message).toContain("unreachable");
  });

  it("treats a Tap server error as failed", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 503 })) as unknown as typeof fetch;
    expect((await testTapConnection({ environment: "test", secretKey: "sk_test_example", fetchImpl })).status).toBe("failed");
  });
});
