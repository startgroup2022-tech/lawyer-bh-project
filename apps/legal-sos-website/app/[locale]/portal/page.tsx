import { notFound } from "next/navigation";
import { PortalGateway } from "@/components/PortalGateway";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function PortalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);
  return <PublicSiteShell locale={locale} dictionary={dictionary} withSosDialog><PortalGateway locale={locale} dictionary={dictionary} /></PublicSiteShell>;
}
