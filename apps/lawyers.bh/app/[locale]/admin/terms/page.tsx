import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import TermsAdminContent from "./TermsAdminContent";
import { publicPolicyType } from "@/lib/terms-management/policy-catalog";

export default async function GeneralTermsAdminPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ policy?: string | string[] }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdminPermission("manage_terms_commissions"))) redirect(`/${locale}/admin`);
  return <TermsAdminContent isAr={locale === "ar"} documentType={publicPolicyType((await searchParams).policy)} />;
}
