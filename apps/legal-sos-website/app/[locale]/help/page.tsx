import { notFound } from "next/navigation";
import { HelpCenter } from "@/components/HelpCenter";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import { getDictionary, isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const title = locale === "ar" ? "مركز المساعدة" : locale === "tr" ? "Yardım merkezi" : "Help center";
  return { title: `${title} | Legal SOS`, description: getDictionary(locale).meta.description };
}

export default async function HelpPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);
  return <PublicSiteShell locale={locale} dictionary={dictionary} withSosDialog>
    <HelpCenter locale={locale} dictionary={dictionary} />
  </PublicSiteShell>;
}
