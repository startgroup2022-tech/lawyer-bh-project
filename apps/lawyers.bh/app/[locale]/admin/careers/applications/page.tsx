import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { careers } from "@/lib/careers/repository";
import ApplicantsAdmin from "./ApplicantsAdmin";
export const dynamic = "force-dynamic";
export default async function ApplicantsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ jobId?: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  if (!(await requireAdminPermission("manage_careers"))) redirect(`/${locale}/admin`);
  const requestedJob = (await searchParams).jobId ?? "";
  const jobs = await careers.jobOptions();
  const jobId = jobs.some((j) => j.id === requestedJob) ? requestedJob : "";
  const result = await careers.listApplications({ jobId });
  return <ApplicantsAdmin locale={locale} jobs={jobs} initialJobId={jobId} initialApplications={result.applications} initialTotal={result.total} />;
}
