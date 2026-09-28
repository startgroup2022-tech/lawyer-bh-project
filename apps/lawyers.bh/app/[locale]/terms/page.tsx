import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublishedTerms } from "@/lib/terms-management/service";
import Content from "./Content";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return buildPageMetadata("terms", locale);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  let terms: { content: string; version: number; publishedAt: string | null } | null = null;
  try {
    const published = await getPublishedTerms("general");
    if (published) {
      terms = {
        content: locale === "ar" ? published.contentAr : published.contentEn,
        version: published.version,
        publishedAt: published.publishedAt,
      };
    }
  } catch (error) {
    console.error("Could not load published general terms; using the built-in fallback.", error);
  }

  return <Content locale={locale} terms={terms} />;
}
