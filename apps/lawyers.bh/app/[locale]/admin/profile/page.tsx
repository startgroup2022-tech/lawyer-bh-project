import { setRequestLocale } from "next-intl/server";
import AdminProfileContent from "./Content";
import { getCurrentAdmin } from "@/lib/auth/admin-access";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await getCurrentAdmin())) redirect(`/${locale}/login/admin`);

  return <AdminProfileContent />;
}
