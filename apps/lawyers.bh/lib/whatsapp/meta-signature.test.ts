import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMetaSignature } from "./meta-signature";

describe("Meta webhook signature", () => {
  it("accepts the sha256 HMAC of the exact raw body", () => {
    const raw = JSON.stringify({ object: "whatsapp_business_account" });
    const digest = createHmac("sha256", "test-secret")
      .update(raw)
      .digest("hex");

    expect(
      verifyMetaSignature(raw, `sha256=${digest}`, "test-secret"),
    ).toBe(true);
  });

  it.each([
    ["changed body", "{}", "sha256=bad"],
    ["missing header", "{}", null],
    ["wrong scheme", "{}", "sha1=bad"],
    ["empty secret", "{}", "sha256=bad"],
  ])("rejects %s", (_name, raw, signature) => {
    expect(verifyMetaSignature(raw, signature, _name === "empty secret" ? "" : "test-secret")).toBe(false);
  });
});
