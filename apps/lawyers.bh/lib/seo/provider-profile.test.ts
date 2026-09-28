import { describe, expect, it } from "vitest";
import { buildProviderGraph, buildProviderMetadata } from "./provider-profile";

const provider = { locale: "ar" as const, slug: "fatima-ali", name: "فاطمة علي", alternateName: "Fatima Ali", subtitle: "محامية مرخصة", image: "/images/lawyers/fatima.jpg", rating: 4.8, reviewCount: 10 };

describe("provider profile SEO", () => {
  it("builds canonical bilingual metadata with the provider image", () => {
    const metadata = buildProviderMetadata(provider);
    expect(metadata.alternates?.canonical).toBe("https://www.lawyers.bh/ar/directory/fatima-ali");
    expect(metadata.alternates?.languages?.en).toBe("https://www.lawyers.bh/en/directory/fatima-ali");
    expect(JSON.stringify(metadata.openGraph?.images)).toContain("fatima.jpg");
  });
  it("builds linked Person, LegalService, and breadcrumb entities", () => {
    const graph = JSON.stringify(buildProviderGraph(provider));
    expect(graph).toContain('"@type":"Person"');
    expect(graph).toContain('"@type":"LegalService"');
    expect(graph).toContain('"@type":"BreadcrumbList"');
    expect(graph).toContain('"reviewCount":10');
  });
  it("does not invent an aggregate rating", () => {
    expect(JSON.stringify(buildProviderGraph({ ...provider, reviewCount: 0 }))).not.toContain("aggregateRating");
  });
});
