import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireSuperAdmin } from "@/lib/auth/admin-access";
import Content from "./Content";

type Props = { params: Promise<{ locale: string }> };

export default async function LanguageManagementPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireSuperAdmin())) redirect(`/${locale}/admin`);
  return <Content isAr={locale === "ar"} />;
}
