import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import RemoteSign from "./RemoteSign";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign Agreement — Lawyers.bh",
  robots: { index: false, follow: false },
};

export default async function AgreementSignPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; caseRef: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale, caseRef } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);

  return <RemoteSign reference={caseRef} token={token ?? ""} />;
}
