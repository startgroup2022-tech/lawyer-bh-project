import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import Content from "./Content";

type Props = {
  params: Promise<{
    locale: string;
    source: "booking" | "emergency";
    id: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";

  return {
    title: isAr ? "تفاصيل الطلب | لوحة مقدم الخدمة" : "Request Details | Provider Dashboard",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function Page({ params }: Props) {
  const { locale, source, id } = await params;

  setRequestLocale(locale);

  return <Content source={source} requestId={id} />;
}
