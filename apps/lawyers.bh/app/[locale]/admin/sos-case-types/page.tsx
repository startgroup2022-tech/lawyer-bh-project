import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import SosCaseTypesContent from "./SosCaseTypesContent";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  if (!(await requireAdminPermission("manage_approvals"))) redirect(`/${locale}/admin`);
  return <SosCaseTypesContent locale={locale} />;
}
