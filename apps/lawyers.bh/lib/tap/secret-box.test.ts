import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decryptSecret, encryptSecret, encryptionConfigured, maskSecret } from "./secret-box";

beforeEach(() => {
  vi.stubEnv("TAP_CONFIG_ENCRYPTION_KEY", "unit-test-encryption-key-value");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("tap secret box", () => {
  it("round-trips a secret", () => {
    const encrypted = encryptSecret("sk_test_super_secret");
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(encrypted).not.toContain("sk_test_super_secret");
    expect(decryptSecret(encrypted)).toBe("sk_test_super_secret");
  });

  it("produces different ciphertext for the same plaintext", () => {
    expect(encryptSecret("sk_test_same")).not.toBe(encryptSecret("sk_test_same"));
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSecret("sk_test_value");
    const parts = encrypted.split(":");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(decryptSecret(parts.join(":"))).toBeNull();
  });

  it("returns null for an unknown format", () => {
    expect(decryptSecret("plaintext")).toBeNull();
    expect(decryptSecret("v2:a:b:c")).toBeNull();
  });

  it("refuses to encrypt without a configured key", () => {
    vi.stubEnv("TAP_CONFIG_ENCRYPTION_KEY", "");
    expect(encryptionConfigured()).toBe(false);
    expect(() => encryptSecret("sk_test_value")).toThrow("TAP_CONFIG_ENCRYPTION_KEY");
  });

  it("masks all but the last four characters", () => {
    expect(maskSecret("sk_test_1234567890")).toBe("••••••••••••7890");
    expect(maskSecret("abc")).toBe("••••");
    expect(maskSecret(null)).toBeNull();
  });
});
