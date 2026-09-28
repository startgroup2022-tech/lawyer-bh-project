import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { training } from "@/lib/training/repository";
import TrainingAdmin from "./TrainingAdmin";
export const dynamic = "force-dynamic";
export default async function TrainingAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  if (!(await requireAdminPermission("manage_training"))) redirect(`/${locale}/admin`);
  const data = await training.listApplications({});
  return <TrainingAdmin locale={locale} initialApplications={data.applications} initialTotal={data.total} />;
}
