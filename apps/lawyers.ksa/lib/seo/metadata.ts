import type { Metadata } from "next";

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
      siteName: "Saudi Lawyers",
      type: "website",
      locale: seoLocale === "ar" ? "ar_BH" : "en_BH",
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/**
 * اسم بديل للتوافق مع الصفحات التي تستخدم:
 *
 * import { buildPageMetadata } from "@/lib/seo/metadata";
 */
export const buildPageMetadata = createPageMetadata;