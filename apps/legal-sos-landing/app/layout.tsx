import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Legal SOS — Bahrain's 24/7 legal emergency dispatch",
  description:
    "A licensed advocate on the line — or at your side — within minutes. Built for arrest, search, travel ban, urgent evidence and criminal-report emergencies. From BHD 25.",
  metadataBase: new URL("https://legalsos.lawyer"),
  alternates: {
    canonical: "/",
    languages: { en: "/", ar: "/?lang=ar" },
  },
  openGraph: {
    title: "Legal SOS — Because the first hour defines your future.",
    description:
      "24/7 emergency legal help in Bahrain. Arrest, search, travel ban, evidence preservation, urgent consultation. From BHD 25.",
    url: "https://legalsos.lawyer",
    siteName: "Legal SOS",
    type: "website",
    locale: "en_BH",
    alternateLocale: ["ar_BH"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Legal SOS — Bahrain's 24/7 legal emergency dispatch",
    description: "A licensed advocate within minutes. From BHD 25.",
  },
  keywords: [
    "legal emergency",
    "Bahrain lawyer",
    "24/7 legal help",
    "arrest defense",
    "criminal lawyer Bahrain",
    "Legal SOS",
    "Saudi Lawyers",
  ],
};

export const viewport: Viewport = {
  themeColor: "#0b1426",
  width: "device-width",
  initialScale: 1,
};

const legalServiceJsonLd = {
  "@context": "https://schema.org",
  "@type": "LegalService",
  name: "Legal SOS",
  alternateName: "ليجال إس‌أو‌إس",
  url: "https://legalsos.lawyer",
  logo: "https://legalsos.lawyer/icon.png",
  image: "https://legalsos.lawyer/og.png",
  description:
    "Bahrain's 24/7 legal emergency dispatch. A licensed advocate on the line — or at your side — within minutes.",
  areaServed: { "@type": "Country", name: "Bahrain" },
  availableLanguage: ["English", "Arabic"],
  hoursAvailable: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    opens: "00:00",
    closes: "23:59",
  },
  telephone: "+97332317070",
  email: "info@gicc.bh",
  parentOrganization: {
    "@type": "Organization",
    name: "GICC — Gulf International Collection and Consulting",
    url: "https://lawyers.bh",
  },
  priceRange: "BHD 25 – BHD 400",
  offers: [
    {
      "@type": "Offer",
      name: "Emergency Consultation",
      price: "25",
      priceCurrency: "BHD",
      description: "15-minute remote legal consultation with a licensed advocate.",
    },
    {
      "@type": "Offer",
      name: "Arrest, Detention & Investigations",
      price: "150",
      priceCurrency: "BHD",
      description: "In-person dispatch to police station or interrogation.",
    },
    {
      "@type": "Offer",
      name: "Search & Seizure",
      price: "200",
      priceCurrency: "BHD",
      description: "On-site counsel during authorised search and seizure.",
    },
    {
      "@type": "Offer",
      name: "Travel Ban / Precautionary Attachment",
      price: "300",
      priceCurrency: "BHD",
      description:
        "Same-day legal response for travel bans and precautionary attachments.",
    },
    {
      "@type": "Offer",
      name: "Urgent Evidence Preservation",
      price: "400",
      priceCurrency: "BHD",
      description: "On-site lawyer for time-critical evidence preservation.",
    },
    {
      "@type": "Offer",
      name: "Urgent Criminal Report",
      price: "150",
      priceCurrency: "BHD",
      description: "Lawyer-assisted filing of urgent criminal report at police station.",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(legalServiceJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
