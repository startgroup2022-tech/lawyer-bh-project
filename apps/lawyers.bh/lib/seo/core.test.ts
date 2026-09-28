import { describe, expect, it } from "vitest";
import { SEO_ORIGIN, absoluteSeoUrl, eligiblePublicImageUrl, localizedAlternates, safeJsonLd } from "./core";

describe("SEO core", () => {
  it("uses one canonical www origin", () => {
    expect(SEO_ORIGIN).toBe("https://www.lawyers.bh");
    expect(absoluteSeoUrl("/ar/directory")).toBe("https://www.lawyers.bh/ar/directory");
  });
  it("builds reciprocal localized alternates", () => {
    expect(localizedAlternates("/directory")).toEqual({ ar: "https://www.lawyers.bh/ar/directory", en: "https://www.lawyers.bh/en/directory", "x-default": "https://www.lawyers.bh/en/directory" });
  });
  it("accepts only crawlable public images", () => {
    expect(eligiblePublicImageUrl("/images/lawyers/example.jpg")).toBe("https://www.lawyers.bh/images/lawyers/example.jpg");
    expect(eligiblePublicImageUrl("https://cdn.example.com/photo.webp")).toBe("https://cdn.example.com/photo.webp");
    expect(eligiblePublicImageUrl("data:image/png;base64,abc")).toBeNull();
    expect(eligiblePublicImageUrl("http://example.com/photo.jpg")).toBeNull();
  });
  it("serializes JSON-LD without script termination", () => {
    const result = safeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(result).not.toContain("</script>");
    expect(result).toContain("\\u003c/script>");
  });
});
