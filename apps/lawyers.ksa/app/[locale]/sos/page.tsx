import { setRequestLocale } from "next-intl/server";
import Content from "./Content";

export const metadata = {
  title: "Legal SOS — Lawyers.bh",
  description:
    "Emergency legal response in Bahrain. Connect with the nearest advocate within minutes. 24/7.",
};

export default async function SosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Content />;
}
