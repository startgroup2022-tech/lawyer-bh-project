import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import Content from "./Content";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";

  return {
    title: isAr ? "لوحة مقدم الخدمة" : "Provider Dashboard",
  };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <Content view="home" />;
}
