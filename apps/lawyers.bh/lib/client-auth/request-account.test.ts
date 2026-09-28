import { describe, expect, it, vi } from "vitest";

import { resolveOptionalClientAccount } from "./request-account";

describe("optional request client authentication", () => {
  it("returns no owner when the authorization header is absent", async () => {
    const resolveSession = vi.fn();

    await expect(
      resolveOptionalClientAccount(new Request("https://lawyers.bh"), resolveSession),
    ).resolves.toBeNull();
    expect(resolveSession).not.toHaveBeenCalled();
  });

  it("returns the active client resolved from the bearer token", async () => {
    const resolveSession = vi.fn(async () => ({
      id: "client-1",
      email: "client@example.com",
      fullName: "Client One",
      phone: "+97330000000",
    }));
    const request = new Request("https://lawyers.bh", {
      headers: { authorization: `Bearer ${"a".repeat(64)}` },
    });

    await expect(resolveOptionalClientAccount(request, resolveSession)).resolves.toEqual({
      id: "client-1",
    });
  });

  it("rejects malformed or expired supplied credentials", async () => {
    const malformed = new Request("https://lawyers.bh", {
      headers: { authorization: "Bearer malformed" },
    });
    await expect(resolveOptionalClientAccount(malformed, vi.fn())).rejects.toMatchObject({
      code: "unauthorized",
      status: 401,
    });

    const expired = new Request("https://lawyers.bh", {
      headers: { authorization: `Bearer ${"b".repeat(64)}` },
    });
    await expect(
      resolveOptionalClientAccount(expired, vi.fn(async () => null)),
    ).rejects.toMatchObject({ code: "unauthorized", status: 401 });
  });
});
