import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeMocks = vi.hoisted(() => ({
  challenge: vi.fn(async () => new Response("challenge", { status: 202 })),
  verify: vi.fn(async () => new Response("verify", { status: 200 })),
}));

vi.mock("@/lib/saraya/public-onboarding/runtime", () => ({
  publicOnboardingHandlers: runtimeMocks,
}));

describe("Saraya public onboarding route exports", () => {
  beforeEach(() => vi.clearAllMocks());

  it("wires the challenge POST export to the Node runtime handler", async () => {
    const route = await import("@/app/api/saraya/v1/public/onboarding/challenge/route");
    const request = new Request("https://sq.lawyers.bh/api/saraya/v1/public/onboarding/challenge", {
      method: "POST",
    });

    expect(route.runtime).toBe("nodejs");
    expect((await route.POST(request)).status).toBe(202);
    expect(runtimeMocks.challenge).toHaveBeenCalledWith(request);
  });

  it("wires the verify POST export to the Node runtime handler", async () => {
    const route = await import("@/app/api/saraya/v1/public/onboarding/verify/route");
    const request = new Request("https://sq.lawyers.bh/api/saraya/v1/public/onboarding/verify", {
      method: "POST",
    });

    expect(route.runtime).toBe("nodejs");
    expect((await route.POST(request)).status).toBe(200);
    expect(runtimeMocks.verify).toHaveBeenCalledWith(request);
  });
});
