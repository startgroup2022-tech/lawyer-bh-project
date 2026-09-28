import { notFound } from "next/navigation";
import { AdminAccessPortal } from "@/components/AdminAccessPortal";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function AdminPortalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);
  return (
    <PublicSiteShell locale={locale} dictionary={dictionary}>
      <AdminAccessPortal locale={locale} dictionary={dictionary} />
    </PublicSiteShell>
  );
}
