import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import Content from "../Content";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "ar" ? "الأرصدة وروابط الدفع" : "Balances & Payment Links" };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Content view="balances" />;
}
