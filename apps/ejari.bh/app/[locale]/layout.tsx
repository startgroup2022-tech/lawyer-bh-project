import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { isInAppWebView } from "@/lib/uaDetection";
import InAppBackBar from "@/components/InAppBackBar";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ejari.bh"),
  title: {
    default: "Ejari.bh — Smart Rental Management in Bahrain",
    template: "%s | Ejari.bh",
  },
  description:
    "Digitized lease agreements, tenant management and rent collection for landlords in the Kingdom of Bahrain.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = (await import(`../../messages/${locale}.json`)).default;
  const h = await headers();
  const inApp = isInAppWebView(h.get("user-agent") ?? "");
  const isAr = locale === "ar";
  return (
    <html lang={locale} dir={isAr ? "rtl" : "ltr"} data-in-app={inApp ? "1" : "0"}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <InAppBackBar inApp={inApp} />
          <div data-in-app-root={inApp ? "1" : "0"}>
            {children}
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
