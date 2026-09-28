import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import MobileNotificationsContent from "./Content";

export default async function MobileNotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdminPermission("manage_notifications"))) redirect(`/${locale}/admin`);
  return <MobileNotificationsContent isAr={locale === "ar"} />;
}
