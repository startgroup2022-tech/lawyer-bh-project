import { notFound } from "next/navigation";
import { LawyerAccessPortal } from "@/components/LawyerAccessPortal";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function LawyerPortalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);
  return (
    <PublicSiteShell locale={locale} dictionary={dictionary}>
      <LawyerAccessPortal locale={locale} dictionary={dictionary} />
    </PublicSiteShell>
  );
}
