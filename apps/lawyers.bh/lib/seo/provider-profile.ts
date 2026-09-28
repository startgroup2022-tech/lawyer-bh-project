import type { Metadata } from "next";
import { absoluteSeoUrl, eligiblePublicImageUrl, localizedAlternates } from "./core";

export type ProviderSeoInput = { locale: "ar" | "en"; slug: string; name: string; alternateName?: string; subtitle: string; image?: string | null; rating?: number; reviewCount?: number };

export function buildProviderMetadata(input: ProviderSeoInput): Metadata {
  const path = `/directory/${encodeURIComponent(input.slug)}`;
  const url = absoluteSeoUrl(`/${input.locale}${path}`);
  const image = eligiblePublicImageUrl(input.image) ?? absoluteSeoUrl("/opengraph-image");
  const title = `${input.name} | ${input.locale === "ar" ? "محامون البحرين" : "Lawyers.bh"}`;
  const description = `${input.name} - ${input.subtitle} ${input.locale === "ar" ? "ضمن منصة محامون البحرين." : "on Lawyers.bh."}`;
  return { title, description, alternates: { canonical: url, languages: localizedAlternates(path) }, openGraph: { type: "profile", url, title, description, siteName: "Lawyers.bh", locale: input.locale === "ar" ? "ar_BH" : "en_BH", images: [{ url: image, alt: input.name }] }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}

export function buildProviderGraph(input: ProviderSeoInput) {
  const path = `/${input.locale}/directory/${encodeURIComponent(input.slug)}`;
  const url = absoluteSeoUrl(path);
  const personId = `${url}#person`;
  const serviceId = `${url}#legal-service`;
  const image = eligiblePublicImageUrl(input.image);
  const hasRating = Number(input.reviewCount) > 0 && Number.isFinite(Number(input.rating));
  return { "@context": "https://schema.org", "@graph": [
    { "@type": "Person", "@id": personId, name: input.name, ...(input.alternateName ? { alternateName: input.alternateName } : {}), ...(image ? { image } : {}), url, worksFor: { "@id": serviceId } },
    { "@type": "LegalService", "@id": serviceId, name: input.name, description: input.subtitle, url, areaServed: { "@type": "Country", name: "Bahrain" }, provider: { "@id": personId }, ...(hasRating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(input.rating).toFixed(1), reviewCount: Number(input.reviewCount) } } : {}) },
    { "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: [
      { "@type": "ListItem", position: 1, name: input.locale === "ar" ? "الرئيسية" : "Home", item: absoluteSeoUrl(`/${input.locale}`) },
      { "@type": "ListItem", position: 2, name: input.locale === "ar" ? "دليل المحامين" : "Lawyers Directory", item: absoluteSeoUrl(`/${input.locale}/directory`) },
      { "@type": "ListItem", position: 3, name: input.name, item: url },
    ] },
  ] };
}
