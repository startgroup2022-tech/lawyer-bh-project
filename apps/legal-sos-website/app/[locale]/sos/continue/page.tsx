import { notFound } from "next/navigation";
import { SosContinuation } from "@/components/SosContinuation";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function ContinueSosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);
  return <PublicSiteShell locale={locale} dictionary={dictionary}><SosContinuation locale={locale} /></PublicSiteShell>;
}
