import { setRequestLocale, getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import HowItWorks from "@/components/HowItWorks";
import Stats from "@/components/Stats";
import AppSection from "@/components/AppSection";
import Partners from "@/components/Partners";
import Footer from "@/components/Footer";

import {
  KeyRound,
  FileText,
  CreditCard,
  ShieldAlert,
  Bell,
  Network,
} from "lucide-react";
import ServiceCard from "@/components/ServiceCard";

type Props = { params: Promise<{ locale: string }> };

const SERVICE_GRADIENTS = [
  "linear-gradient(135deg, #029A7A 0%, #4C5D77 100%)",
  "linear-gradient(135deg, #4C5D77 0%, #1A2A3F 100%)",
  "linear-gradient(135deg, #03C39A 0%, #029A7A 100%)",
  "linear-gradient(135deg, #1A2A3F 0%, #029A7A 100%)",
  "linear-gradient(135deg, #2BD6AF 0%, #4C5D77 100%)",
  "linear-gradient(135deg, #4C5D77 0%, #03C39A 100%)",
];

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isAr = locale === "ar";
  const otherLocale = isAr ? "en" : "ar";

const services = [
  {
    icon: CreditCard,
    k: "payments",
    href: "/services/payments",
  },
  {
    icon: KeyRound,
    k: "tenants",
    href: "/services/tenants",
  },
  {
    icon: FileText,
    k: "contracts",
    href: "/services/contracts",
  },
  {
    icon: Network,
    k: "integration",
    href: "/services/integration",
  },
  {
    icon: ShieldAlert,
    k: "disputes",
    href: "/services/disputes",
  },
  {
    icon: Bell,
    k: "notifications",
    href: "/services/notifications",
  },
] as const;

  return (
    <main>
      
      <Header locale={locale} />
      
      <Hero locale={locale} />

      <Stats locale={locale} />

      <Services locale={locale} />

      <HowItWorks locale={locale} />

      <AppSection locale={locale} />

      <Partners locale={locale} />

      <Footer locale={locale} />


    </main>
  );
}
