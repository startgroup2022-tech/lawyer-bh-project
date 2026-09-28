import { describe, expect, it } from "vitest";

import { resolveMobileTapPostUrl } from "./mobile-post-url";

describe("resolveMobileTapPostUrl", () => {
  it("uses the existing Tap webhook when no override is configured", () => {
    expect(
      resolveMobileTapPostUrl({
        configuredPostUrl: "",
        siteUrl: "https://lawyers.bh/",
      }),
    ).toBe("https://lawyers.bh/api/tap/webhook");
  });

  it("keeps an explicitly configured Tap post URL", () => {
    expect(
      resolveMobileTapPostUrl({
        configuredPostUrl: "https://payments.example.com/tap",
        siteUrl: "https://lawyers.bh",
      }),
    ).toBe("https://payments.example.com/tap");
  });
});
