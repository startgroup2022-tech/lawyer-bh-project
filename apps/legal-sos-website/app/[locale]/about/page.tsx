import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AboutPage } from "@/components/AboutPage";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import { getDictionary, isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = getDictionary(locale);
  return { title: `${dictionary.nav.about} | Legal SOS`, description: dictionary.about.introduction };
}

export default async function AboutRoute({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);

  return (
    <PublicSiteShell locale={locale} dictionary={dictionary} withSosDialog>
      <AboutPage locale={locale} dictionary={dictionary} />
    </PublicSiteShell>
  );
}
