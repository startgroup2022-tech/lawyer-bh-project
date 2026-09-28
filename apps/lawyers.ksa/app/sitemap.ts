import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { seoPages, SITE_URL } from "@/lib/seo/pages";

function createUrl(locale: string, path: string): string {
  return new URL(`/${locale}${path}`, SITE_URL).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  return seoPages.flatMap((page) =>
    routing.locales.map((locale) => ({
      url: createUrl(locale, page.path),

      // يجب أن يكون تاريخ آخر تعديل حقيقي للصفحة
      ...(page.lastModified && {
        lastModified: new Date(page.lastModified),
      }),

      alternates: {
        languages: {
          ...Object.fromEntries(
            routing.locales.map((language) => [
              language,
              createUrl(language, page.path),
            ]),
          ),
          "x-default": createUrl("en", page.path),
        },
      },
    })),
  );
}