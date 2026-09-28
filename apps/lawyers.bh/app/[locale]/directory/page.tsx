import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicLawyers } from "@/lib/publicLawyers";
import Content from "./Content";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return buildPageMetadata("directory", locale);
}

export const dynamic = "force-dynamic";

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const lawyers = await getPublicLawyers();

  return <Content lawyers={lawyers} />;
}