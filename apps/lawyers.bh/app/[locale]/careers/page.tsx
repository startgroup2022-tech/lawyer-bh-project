import { setRequestLocale } from "next-intl/server";
import { careers } from "@/lib/careers/repository";
import { createPageMetadata } from "@/lib/seo/metadata";
import CareersView from "./CareersView";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) { return createPageMetadata("careers", (await params).locale); }
export default async function CareersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const page = Math.min(10000, Math.max(1, Math.floor(Number((await searchParams).page)) || 1));
  const { jobs, hasMore } = await careers.listJobs(true, page);
  return <CareersView locale={locale} jobs={jobs} page={page} hasMore={hasMore} />;
}
