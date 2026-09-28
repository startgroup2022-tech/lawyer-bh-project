import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import Content from "./Content";
import { execSections, getMemberSlug, getTeamPeople } from "./team-data";
import { getPublicAboutSections } from "@/lib/about-management/service";

type Props = {
  params: Promise<{
    locale: string;
  }>;
};

const SITE_URL = "https://www.lawyers.bh";

function stringifyJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function absoluteUrl(path: string) {
  return new URL(path, `${SITE_URL}/`).toString();
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;

  return buildPageMetadata("about", locale);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;

  setRequestLocale(locale);

  const isArabic = locale === "ar";
  const aboutUrl = `${SITE_URL}/${locale}/about`;
  const organizationId = `${SITE_URL}/#organization`;

  const sections = await getPublicAboutSections().catch((error) => {
    console.error("Unable to load managed About profiles", error);
    return execSections;
  });
  const teamPeople = getTeamPeople(sections);

  const personReferences = teamPeople.map((member) => ({
    "@id": `${aboutUrl}#${getMemberSlug(member)}`,
  }));

  const personSchemas = teamPeople.map((member) => {
    const slug = getMemberSlug(member);
    const personId = `${aboutUrl}#${slug}`;
    const name = isArabic ? member.name.ar : member.name.en;
    const alternateName = isArabic ? member.name.en : member.name.ar;
    const jobTitle = isArabic ? member.title.ar : member.title.en;

    return {
      "@type": "Person",
      "@id": personId,
      name,
      alternateName,
      jobTitle,
      url: personId,
      description: isArabic
        ? `${name}، ${jobTitle} لدى منصة محامون البحرين.`
        : `${name}, ${jobTitle} at Bahrain Lawyers.`,
      ...(member.photo
        ? {
            image: {
              "@type": "ImageObject",
              url: absoluteUrl(member.photo),
              caption: isArabic
                ? `${name}، ${jobTitle}`
                : `${name}, ${jobTitle}`,
            },
          }
        : {}),
      worksFor: {
        "@id": organizationId,
      },
      memberOf: {
        "@id": organizationId,
      },
    };
  });

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${aboutUrl}#webpage`,
        url: aboutUrl,
        name: isArabic
          ? "من نحن | محامون البحرين"
          : "About Us | Bahrain Lawyers",
        description: isArabic
          ? "تعرف على منصة محامون البحرين، رؤيتها، رسالتها، إدارتها التنفيذية وفريق العمل."
          : "Learn about Bahrain Lawyers, its vision, mission, executive management and team.",
        inLanguage: isArabic ? "ar-BH" : "en-BH",
        about: {
          "@id": organizationId,
        },
        mentions: personReferences,
      },
      {
        "@type": "Organization",
        "@id": organizationId,
        name: isArabic ? "محامون البحرين" : "Bahrain Lawyers",
        alternateName: isArabic ? "Bahrain Lawyers" : "محامون البحرين",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/images/logo-icon.png`,
          width: 512,
          height: 512,
        },
        employee: personReferences,
        member: personReferences,
      },
      ...personSchemas,
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: stringifyJsonLd(structuredData),
        }}
      />

      <Content sections={sections} />
    </>
  );
}
