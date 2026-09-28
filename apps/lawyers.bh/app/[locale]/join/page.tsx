import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import Content from "./Content";
import { redirectAuthenticatedEntry } from "@/lib/auth/session-entry";
import { getPublishedTerms } from "@/lib/terms-management/service";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return buildPageMetadata("join", locale);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await redirectAuthenticatedEntry(locale);

  const terms = await getPublishedTerms("lawyer_registration").catch((error) => {
    console.error("[join] failed to load lawyer registration terms", error);
    return null;
  });

  return <Content registrationTerms={terms ? {
    id: terms.id,
    version: terms.version,
    content: locale === "ar" ? terms.contentAr : terms.contentEn,
    platformPercentageYearOne: terms.platformPercentageYearOne,
    platformPercentageYearTwo: terms.platformPercentageYearTwo,
    lawyerPercentageYearOne: terms.lawyerPercentageYearOne,
    lawyerPercentageYearTwo: terms.lawyerPercentageYearTwo,
  } : null} />;
}
