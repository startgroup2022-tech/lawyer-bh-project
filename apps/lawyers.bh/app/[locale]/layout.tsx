import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Noto_Kufi_Arabic } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import YourGPTWidget from "@/components/YourGPTWidget";
import InAppBackBar from "@/components/InAppBackBar";
import DisclaimerPopup from "@/components/DisclaimerPopup";

import { isIOSInAppWebView } from "@/lib/uaDetection";
import { routing } from "@/i18n/routing";
import { SEO_ORIGIN, safeJsonLd } from "@/lib/seo/core";
import { buildSiteGraph } from "@/lib/seo/site-graph";

import "../globals.css";

const bodyFont = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const milanDisplay = localFont({
  src: "../fonts/Milan-Display-Black-Swashes.otf",
  variable: "--font-milan-display",
  display: "swap",
  weight: "900",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({
    locale,
    namespace: "metadata.home",
  });

  const siteName =
    locale === "ar" ? "منصة محامون البحرين" : "Lawyers.bh";

  return {
    metadataBase: new URL(SEO_ORIGIN),

    title: {
      default: siteName,
      template: `%s — ${siteName}`,
    },

    description: t("description"),

    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        ar: "/ar",
        "x-default": "/en",
      },
    },

    openGraph: {
      type: "website",
      locale: locale === "ar" ? "ar_BH" : "en_BH",
      alternateLocale: locale === "ar" ? "en_BH" : "ar_BH",
      url: `${SEO_ORIGIN}/${locale}`,
      siteName: "Lawyers.bh",
      title: t("title"),
      description: t("description"),
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Lawyers.bh",
        },
      ],
    },

    twitter: {
      card: "summary",
      title: t("title"),
      description: t("description"),
      images: ["/twitter-image"],
    },

    icons: {
      icon: "/favicon.ico",
      apple: "/apple-icon.png",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const requestHeaders = await headers();
  const inApp = isIOSInAppWebView(
    requestHeaders.get("user-agent") ?? "",
  );

  const dir = locale === "ar" ? "rtl" : "ltr";

  const orgJsonLd = buildSiteGraph(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      data-in-app={inApp ? "1" : "0"}
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body
        className={`${bodyFont.className} ${
          locale === "ar" ? milanDisplay.variable : ""
        } flex min-h-full flex-col`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(orgJsonLd),
          }}
        />

        <NextIntlClientProvider>
          <Header />

          <InAppBackBar inApp={inApp} />

          <main className="flex-1">{children}</main>

          <Footer />

          <DisclaimerPopup />
        </NextIntlClientProvider>

        <Analytics />

        <YourGPTWidget locale={locale} />
      </body>
    </html>
  );
}
