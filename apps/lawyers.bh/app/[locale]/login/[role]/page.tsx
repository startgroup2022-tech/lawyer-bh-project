import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import RoleLoginForm from "../RoleLoginForm";
import { redirectAuthenticatedEntry } from "@/lib/auth/session-entry";
import { privatePageRobots } from "@/lib/seo/indexing-policy";

export const metadata = { robots: privatePageRobots };
export default async function Page({ params }: { params: Promise<{ locale: string; role: string }> }) {
  const { locale, role } = await params;
  setRequestLocale(locale);
  if (role !== "provider" && role !== "admin") notFound();
  await redirectAuthenticatedEntry(locale, role);
  return <RoleLoginForm locale={locale} role={role} />;
}
