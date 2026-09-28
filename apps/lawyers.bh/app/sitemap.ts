import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { seoPages, SITE_URL } from "@/lib/seo/pages";
import { getPublicLawyers } from "@/lib/publicLawyers";
import { buildProviderSitemapEntries } from "@/lib/seo/provider-sitemap";
import { careers } from "@/lib/careers/repository";

export const dynamic = "force-dynamic";

function createUrl(locale: string, path: string): string {
  return new URL(`/${locale}${path}`, SITE_URL).toString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = seoPages.flatMap((page) =>
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
  let jobEntries: MetadataRoute.Sitemap = [];
  try {
    jobEntries = (await careers.sitemapJobs()).flatMap((job) => routing.locales.map((locale) => ({
      url: createUrl(locale, `/careers/${job.slug}`), lastModified: new Date(job.updatedAt),
      alternates: { languages: { ar: createUrl("ar", `/careers/${job.slug}`), en: createUrl("en", `/careers/${job.slug}`), "x-default": createUrl("en", `/careers/${job.slug}`) } },
    })));
  } catch { console.error("[sitemap] careers unavailable"); }
  try {
    const providers = await getPublicLawyers();
    return [...staticEntries, ...jobEntries, ...buildProviderSitemapEntries(providers)];
  } catch (error) {
    console.error("[sitemap] public provider load failed", error instanceof Error ? error.message : "unknown");
    return [...staticEntries, ...jobEntries];
  }
}
