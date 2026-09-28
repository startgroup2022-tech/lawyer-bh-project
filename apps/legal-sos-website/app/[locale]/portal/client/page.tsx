import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PortalShell } from "@/components/PortalShell";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function ClientPortalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);

  return (
    <PublicSiteShell locale={locale} dictionary={dictionary} withSosDialog>
      <div className="container portal-route-back"><Link href={`/${locale}/portal`}>{dictionary.portal.gateway.back}</Link></div>
      <Suspense fallback={<main><div className="container" role="status">{dictionary.portal.auth.loading}</div></main>}>
        <PortalShell locale={locale} dictionary={dictionary} />
      </Suspense>
    </PublicSiteShell>
  );
}
