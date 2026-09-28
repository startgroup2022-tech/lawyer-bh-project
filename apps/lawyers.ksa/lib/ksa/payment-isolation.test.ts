import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const paymentSources = [
  "app/api/mobile/tap/payment-session/route.ts",
  "app/api/mobile/tap/payment-confirm/route.ts",
  "app/api/mobile/tap/payment-status/route.ts",
  "app/api/tap/charge/route.ts",
  "app/api/tap/webhook/route.ts",
  "app/api/yourgpt/payment-session/route.ts",
  "lib/tap/mobile-payment-contract.ts",
  "lib/tap/mobile-payment-session.ts",
  "lib/tap/live-sdk-session.ts",
  "lib/tap/onboarding-runtime.ts",
];

describe("Lawyers KSA payment isolation", () => {
  it.each(paymentSources)("keeps %s on Saudi tables and currency", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");

    expect(source).not.toMatch(/public\.bahrain_/i);
    expect(source).not.toMatch(/bahrain_tap_retailer_onboarding/i);
    expect(source).not.toMatch(/["']BHD["']/);
    expect(source).not.toMatch(/["']BH["']/);
  });
});
