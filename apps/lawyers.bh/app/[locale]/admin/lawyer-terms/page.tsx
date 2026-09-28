import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import LawyerTermsAdminContent from "./LawyerTermsAdminContent";

export default async function LawyerTermsAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdminPermission("manage_terms_commissions"))) redirect(`/${locale}/admin`);
  return <LawyerTermsAdminContent isAr={locale === "ar"} />;
}
