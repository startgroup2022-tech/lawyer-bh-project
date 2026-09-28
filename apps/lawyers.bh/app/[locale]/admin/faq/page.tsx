import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import FaqAdminContent from "./FaqAdminContent";

export default async function FaqAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdminPermission("manage_faq"))) redirect(`/${locale}/admin`);
  return <FaqAdminContent isAr={locale === "ar"} />;
}
