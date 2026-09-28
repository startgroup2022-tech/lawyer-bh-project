import type { MetadataRoute } from "next";
import { absoluteSeoUrl, eligiblePublicImageUrl, localizedAlternates } from "./core";

type SitemapProvider = { slug: string; image?: string | null; updatedAt?: string | Date | null; createdAt?: string | Date | null };

export function buildProviderSitemapEntries(providers: readonly SitemapProvider[]): MetadataRoute.Sitemap {
  return providers.flatMap((provider) => {
    const slug = encodeURIComponent(provider.slug);
    const path = `/directory/${slug}`;
    const image = eligiblePublicImageUrl(provider.image);
    const dateValue = provider.updatedAt ?? provider.createdAt;
    const lastModified = dateValue && !Number.isNaN(new Date(dateValue).getTime()) ? new Date(dateValue) : undefined;
    return (["ar", "en"] as const).map((locale) => ({
      url: absoluteSeoUrl(`/${locale}${path}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(lastModified ? { lastModified } : {}),
      ...(image ? { images: [image] } : {}),
      alternates: { languages: localizedAlternates(path) },
    }));
  });
}
