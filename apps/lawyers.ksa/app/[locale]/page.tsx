import { headers } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import LegalToolsTabs from "@/components/LegalToolsTabs";
import ClearanceServices from "@/components/ClearanceServices";
import InAppHome from "@/components/InAppHome";
import { isIOSInAppWebView } from "@/lib/uaDetection";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const h = await headers();
  const inApp = isIOSInAppWebView(h.get("user-agent") ?? "");

  if (inApp) return <InAppHome />;

  return (
    <>
      <Hero />
      <Services />
      <LegalToolsTabs />
      <ClearanceServices />
    </>
  );
}
