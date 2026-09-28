import { setRequestLocale } from "next-intl/server";
import Content from "./Content";

export const metadata = {
  title: "Become an Emergency Advocate — Lawyers.bh",
  description:
    "Join the Legal SOS roster. Receive emergency case dispatches in your radius and respond within 10 minutes.",
};

export default async function SosLawyerJoinPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Content />;
}
