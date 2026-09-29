import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireSuperAdmin } from "@/lib/auth/admin-access";
import Content from "./Content";

export default async function AppearancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireSuperAdmin())) redirect(`/${locale}/admin`);
  return <Content isAr={locale === "ar"} />;
}
