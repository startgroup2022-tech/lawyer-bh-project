import { setRequestLocale } from "next-intl/server";
import LoginOptions from "./LoginOptions";
import { redirectAuthenticatedEntry } from "@/lib/auth/session-entry";
import { privatePageRobots } from "@/lib/seo/indexing-policy";

export const metadata = { robots: privatePageRobots };
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await redirectAuthenticatedEntry(locale);
  return <LoginOptions locale={locale} />;
}
