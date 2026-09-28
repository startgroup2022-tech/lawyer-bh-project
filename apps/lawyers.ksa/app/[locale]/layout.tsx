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

const SITE_URL = "https://lawyers.bh";

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
    locale === "ar" ? "منصة محامون السعودية" : "Lawyers.bh";

  return {
    metadataBase: new URL(SITE_URL),

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
      url: `${SITE_URL}/${locale}`,
      siteName: "Saudi Lawyers",
      title: t("title"),
      description: t("description"),
      images: [
        {
          url: "/images/ksa-social-share-v2.png",
          width: 1200,
          height: 1200,
          alt: "Saudi Lawyers",
        },
      ],
    },

    twitter: {
      card: "summary",
      title: t("title"),
      description: t("description"),
      images: ["/images/ksa-social-share-v2.png"],
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

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    name: "Saudi Lawyers",
    alternateName: "منصة محامون السعودية",
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo-full.png`,
    telephone: "+97317537070",
    email: "info@lawyers.bh",
    address: {
      "@type": "PostalAddress",
      streetAddress:
        "Saraya Square Complex, Building 1853G, Road 1546, Block 815",
      addressLocality: "Isa Town",
      addressCountry: "BH",
    },
    areaServed: {
      "@type": "Country",
      name: "Bahrain",
    },
    sameAs: ["https://instagram.com/lawyers.bh"],
  };

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
            __html: JSON.stringify(orgJsonLd),
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
