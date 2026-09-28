import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { careers } from "@/lib/careers/repository";
import JobsAdmin from "./JobsAdmin";
import { countryCatalog } from "@/lib/countries/catalog";
export const dynamic = "force-dynamic";
export default async function CareersAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  if (!(await requireAdminPermission("manage_careers"))) redirect(`/${locale}/admin`);
  const { jobs, hasMore } = await careers.listJobs();
  return <JobsAdmin locale={locale} initialJobs={jobs} initialHasMore={hasMore} countries={countryCatalog} />;
}
