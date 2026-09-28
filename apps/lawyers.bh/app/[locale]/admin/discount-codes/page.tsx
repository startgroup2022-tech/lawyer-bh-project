import { setRequestLocale } from "next-intl/server";
import DiscountCodesContent from "./DiscountCodesContent";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { redirect } from "next/navigation";

export default async function DiscountCodesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdminPermission("manage_discounts"))) redirect(`/${locale}/admin`);
  return <DiscountCodesContent isAr={locale === "ar"} />;
}
