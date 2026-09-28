import { describe, expect, it } from "vitest";
import { appleAssociationResponse, assetLinksResponse, paymentReturnFallback } from "./http";

describe("Saraya verified mobile web association", () => {
  it("fails safe with empty associations when deployment signing values are absent", async () => {
    await expect((await assetLinksResponse({})).json()).resolves.toEqual([]);
    await expect((await appleAssociationResponse({})).json()).resolves.toEqual({
      applinks: { apps: [], details: [] },
    });
  });

  it("publishes exact app identifiers only with configured signing values", async () => {
    const asset = await (await assetLinksResponse({ SARAYA_ANDROID_SHA256_CERT_FINGERPRINTS: "AA:BB, CC:DD" })).json();
    expect(asset).toEqual([expect.objectContaining({ target: {
      namespace: "android_app",
      package_name: "bh.lawyers.saraya_square_app",
      sha256_cert_fingerprints: ["AA:BB", "CC:DD"],
    } })]);
    const apple = await (await appleAssociationResponse({ SARAYA_APPLE_TEAM_ID: "ABCDE12345" })).json() as { applinks: { details: unknown[] } };
    expect(apple.applinks.details).toEqual([{ appID: "ABCDE12345.bh.lawyers.sarayaSquareApp", paths: ["/saraya/rental-requests/*"] }]);
  });

  it("keeps an HTTPS browser fallback to the Flutter hash route", () => {
    const response = paymentReturnFallback("55555555-5555-4555-8555-555555555555", "https://sq.lawyers.bh/saraya/rental-requests/x");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://sq.lawyers.bh/saraya/index.html#/rental-requests/55555555-5555-4555-8555-555555555555");
  });
});
