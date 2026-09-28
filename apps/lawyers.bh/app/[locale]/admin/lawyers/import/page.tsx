import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import Content from "./Content";

export default async function LawyerImportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await requireAdminPermission("manage_lawyers"))) redirect(`/${locale}/admin`);
  setRequestLocale(locale);
  return <Content locale={locale === "ar" ? "ar" : "en"} />;
}
