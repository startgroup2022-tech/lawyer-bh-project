import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import { getDictionary, isLocale } from "@/lib/i18n";
import { getTermsContent } from "@/lib/terms-content";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = getTermsContent(locale);
  return { title: `${copy.title} | LegalSOS`, description: copy.subtitle };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getTermsContent(locale);
  const dictionary = getDictionary(locale);

  return (
    <PublicSiteShell locale={locale} dictionary={dictionary}>
      <main className="legal-page"><article className="legal-document">
        <p className="eyebrow">LegalSOS</p>
        <h1>{copy.title}</h1>
        <p className="legal-subtitle">{copy.subtitle}</p>
        <p className="legal-owner">{copy.owner}</p>
        <p className="legal-updated">{copy.lastUpdated}</p>
        <div className="legal-sections">
          {copy.sections.map((section) => (
            <section className="legal-section" key={section.key}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      </article></main>
    </PublicSiteShell>
  );
}
