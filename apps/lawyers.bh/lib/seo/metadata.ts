import type { Metadata } from "next";
import { absoluteSeoUrl } from "./core";

import {
  getLocalizedPageUrl,
  getLocalizedSeo,
  getPageLanguageAlternates,
  type SeoPageKey,
} from "@/lib/seo/pages";

/**
 * إنشاء Metadata مترجمة لأي صفحة معرفة داخل SEO configuration.
 */
export function createPageMetadata(
  pageKey: SeoPageKey,
  locale: string,
): Metadata {
  const {
    title,
    description,
    keywords,
    locale: seoLocale,
  } = getLocalizedSeo(pageKey, locale);

  const canonicalUrl = getLocalizedPageUrl(
    pageKey,
    seoLocale,
  );

  const languageAlternates =
    getPageLanguageAlternates(pageKey);

  return {
    title,
    description,
    keywords,

    alternates: {
      canonical: canonicalUrl,

      languages: {
        ...languageAlternates,
      },
    },

    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Lawyers.bh",
      type: "website",
      locale: seoLocale === "ar" ? "ar_BH" : "en_BH",
      images: [{ url: absoluteSeoUrl("/opengraph-image"), width: 1200, height: 630, alt: "Lawyers.bh" }],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteSeoUrl("/twitter-image")],
    },
  };
}

/**
 * اسم بديل للتوافق مع الصفحات التي تستخدم:
 *
 * import { buildPageMetadata } from "@/lib/seo/metadata";
 */
export const buildPageMetadata = createPageMetadata;
