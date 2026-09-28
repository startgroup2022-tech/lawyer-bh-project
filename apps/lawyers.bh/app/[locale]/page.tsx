import { setRequestLocale } from "next-intl/server";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import LegalToolsTabs from "@/components/LegalToolsTabs";
import ClearanceServices from "@/components/ClearanceServices";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <Services />
      <LegalToolsTabs />
      <ClearanceServices />
    </>
  );
}
