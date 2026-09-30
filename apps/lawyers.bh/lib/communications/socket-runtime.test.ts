import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  delete globalThis.__communicationBridgeStarted;
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("communication socket runtime", () => {
  it("requires a socket secret of at least 32 characters", async () => {
    vi.stubEnv("COMMUNICATION_SOCKET_SECRET", "");
    vi.stubEnv("MOBILE_DISPATCH_SECRET", "");
    vi.stubEnv("LAWYER_AUTH_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.resetModules();
    const { communicationSocketSecret } = await import("./socket-runtime");
    expect(() => communicationSocketSecret()).toThrow(/at least 32 characters/);

    vi.stubEnv("COMMUNICATION_SOCKET_SECRET", "short");
    vi.resetModules();
    const short = await import("./socket-runtime");
    expect(() => short.communicationSocketSecret()).toThrow(/at least 32 characters/);
  });

  it("falls back through the dispatch, lawyer and auth secrets", async () => {
    vi.stubEnv("COMMUNICATION_SOCKET_SECRET", "");
    vi.stubEnv("MOBILE_DISPATCH_SECRET", "");
    vi.stubEnv("LAWYER_AUTH_SECRET", "lawyer-auth-secret-0123456789abcdef");
    vi.resetModules();
    const { communicationSocketSecret } = await import("./socket-runtime");
    expect(communicationSocketSecret()).toBe("lawyer-auth-secret-0123456789abcdef");
  });

  it("starts the bridge once per process", async () => {
    vi.resetModules();
    const { ensureCommunicationBridgeStarted } = await import("./socket-runtime");
    const first = ensureCommunicationBridgeStarted();
    const second = ensureCommunicationBridgeStarted();
    expect(first).toBe(second);
    // The LISTEN bridge cannot connect without a database; swallow the rejected
    // promise so the assertion above stays the only thing under test.
    await first.catch(() => undefined);
  });
});
