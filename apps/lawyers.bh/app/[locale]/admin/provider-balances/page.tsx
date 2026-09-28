import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { sqlClient } from "@/lib/db/client";
import Content from "./Content";

type Lawyer = { id: string; full_name_ar: string; full_name_en: string; country_code: string };

export default async function AdminProviderBalancesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await requireAdminPermission("manage_finance"))) redirect(`/${locale}/admin`);
  setRequestLocale(locale);
  const lawyers = await sqlClient<Lawyer[]>`SELECT id::text, full_name_ar, full_name_en, country_code FROM bahrain_lawyers WHERE status = 'approved' ORDER BY full_name_ar LIMIT 1000`;
  return <Content locale={locale === "ar" ? "ar" : "en"} lawyers={lawyers.map((row) => ({ id: row.id, nameAr: row.full_name_ar, nameEn: row.full_name_en, countryCode: row.country_code }))} />;
}
