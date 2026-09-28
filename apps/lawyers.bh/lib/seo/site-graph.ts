import { absoluteSeoUrl, SEO_ORIGIN } from "./core";

export function buildSiteGraph(locale: string) {
  const isAr = locale === "ar";
  const organizationId = `${SEO_ORIGIN}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: isAr ? "منصة محامون البحرين" : "Lawyers.bh",
        alternateName: isAr ? "Lawyers.bh" : "منصة محامون البحرين",
        url: `${SEO_ORIGIN}/`,
        logo: { "@type": "ImageObject", url: absoluteSeoUrl("/images/logo-full9.png") },
        telephone: "+97317537070",
        email: "info@lawyers.bh",
        address: { "@type": "PostalAddress", streetAddress: "Saraya Square Complex, Building 1853G, Road 1546, Block 815", addressLocality: "Isa Town", addressCountry: "BH" },
        areaServed: { "@type": "Country", name: "Bahrain" },
        sameAs: ["https://instagram.com/lawyers.bh"],
      },
      {
        "@type": "WebSite",
        "@id": `${SEO_ORIGIN}/#website`,
        url: `${SEO_ORIGIN}/`,
        name: "Lawyers.bh",
        inLanguage: isAr ? "ar-BH" : "en-BH",
        publisher: { "@id": organizationId },
      },
    ],
  };
}
