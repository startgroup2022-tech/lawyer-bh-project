import { describe, expect, it } from "vitest";

import {
  createOpaqueToken,
  hashOpaqueToken,
  normalizeOnboardingEmail,
  normalizeProfessionalIdentifier,
  safeEqualTokenHash,
} from "./lawyer-onboarding";

describe("lawyer onboarding security primitives", () => {
  it("normalizes Arabic digits and removes identifier whitespace", () => {
    expect(normalizeProfessionalIdentifier(" ١٢-٣٤ ٥ ")).toBe("12-345");
    expect(normalizeProfessionalIdentifier(" AB  12 ")).toBe("AB12");
  });

  it("normalizes email case and surrounding whitespace", () => {
    expect(normalizeOnboardingEmail("  Lawyer@Example.COM ")).toBe(
      "lawyer@example.com",
    );
  });

  it("creates URL-safe 32-byte opaque tokens", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
  });

  it("accepts only the token matching the stored SHA-256 hash", () => {
    const token = "x".repeat(43);
    const hash = hashOpaqueToken(token);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(safeEqualTokenHash(token, hash)).toBe(true);
    expect(safeEqualTokenHash(`${token}y`, hash)).toBe(false);
    expect(safeEqualTokenHash(token, "not-a-hash")).toBe(false);
  });
});
