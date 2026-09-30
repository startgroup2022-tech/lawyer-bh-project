import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/lib/auth/admin-access";
import TapPaymentsContent from "./TapPaymentsContent";

export default async function TapPaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireSuperAdmin())) redirect(`/${locale}/admin`);
  return <TapPaymentsContent isAr={locale === "ar"} />;
}
