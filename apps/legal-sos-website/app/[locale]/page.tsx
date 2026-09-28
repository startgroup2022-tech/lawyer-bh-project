import { notFound } from "next/navigation";
import { Hero } from "@/components/Hero";
import { LandingSections } from "@/components/LandingSections";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);
  return (
    <PublicSiteShell locale={locale} dictionary={dictionary} withSosDialog>
      <main><Hero locale={locale} dictionary={dictionary} /><LandingSections locale={locale} dictionary={dictionary} /></main>
    </PublicSiteShell>
  );
}
