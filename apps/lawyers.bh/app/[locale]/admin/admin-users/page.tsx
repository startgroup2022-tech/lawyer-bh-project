import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/admin-access";
import AdminUsersContent from "./AdminUsersContent";

export default async function AdminUsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireSuperAdmin())) redirect(`/${locale}/admin`);
  return <AdminUsersContent isAr={locale === "ar"} />;
}
