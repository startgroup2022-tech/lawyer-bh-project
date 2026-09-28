import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft, BriefcaseBusiness, MapPin, CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { careers } from "@/lib/careers/repository";
import { isOpenJob, jobStructuredData } from "@/lib/careers/domain";
import { cardClass, label } from "@/lib/careers/ui";
import { SEO_ORIGIN } from "@/lib/seo/core";
import ApplicationForm from "./ApplicationForm";

export const dynamic = "force-dynamic";
const loadJob = cache((slug: string) => careers.findPublicJob(slug));
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params; const job = await loadJob(slug);
  if (!job) return { title: "Position unavailable", robots: { index: false, follow: true } };
  const ar = locale === "ar"; const title = `${ar ? job.titleAr : job.titleEn} | ${ar ? "وظائف محامون البحرين" : "Lawyers.bh Careers"}`;
  const description = (ar ? job.descriptionAr : job.descriptionEn).slice(0, 160); const url = `${SEO_ORIGIN}/${locale}/careers/${slug}`;
  return { title, description, alternates: { canonical: url, languages: { ar: `${SEO_ORIGIN}/ar/careers/${slug}`, en: `${SEO_ORIGIN}/en/careers/${slug}`, "x-default": `${SEO_ORIGIN}/en/careers/${slug}` } }, robots: { index: isOpenJob(job), follow: true }, openGraph: { title, description, url, type: "website" }, twitter: { card: "summary", title, description } };
}
export default async function CareerDetailPage({ params }: Props) {
  const { locale, slug } = await params; setRequestLocale(locale);
  const job = await loadJob(slug); if (!job) notFound();
  const ar = locale === "ar"; const open = isOpenJob(job); const schema = jobStructuredData(job, locale);
  return <main dir={ar ? "rtl" : "ltr"} className="bg-[#F3F6FA] px-5 py-12 text-[#082B67]">
    {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />}
    <div className="mx-auto max-w-6xl">
      <Link href={`/${locale}/careers`} className="mb-8 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold shadow-sm"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{ar ? "جميع الوظائف" : "All positions"}</Link>
      <div className={`${cardClass} mb-7 p-8 md:p-10`}><p className="text-sm font-bold text-[#B4232A]">{ar ? "انضم إلى فريق محامون البحرين" : "Join the Lawyers.bh team"}</p><h1 className="mt-4 text-3xl font-black md:text-4xl">{ar ? job.titleAr : job.titleEn}</h1><div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-600"><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{ar ? job.cityAr : job.cityEn} · {job.country}</span><span className="inline-flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4" />{label(job.employmentType, ar)} · {label(job.workMode, ar)}</span><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{ar ? "آخر موعد" : "Closing date"}: {new Date(job.closesAt).toLocaleDateString(ar ? "ar-BH" : "en-GB", { timeZone: "Asia/Bahrain" })}</span></div>{job.salary && <p className="mt-4 text-sm font-bold">{ar ? "الراتب" : "Salary"}: {job.salary}</p>}</div>
      <div className="grid items-start gap-7 lg:grid-cols-2">
        <div className={`${cardClass} space-y-8`}><section><h2 className="mb-4 text-xl font-black">{ar ? "عن الوظيفة" : "About the role"}</h2><p className="whitespace-pre-wrap break-words text-sm leading-8 text-slate-600">{ar ? job.descriptionAr : job.descriptionEn}</p></section><section><h2 className="mb-4 text-xl font-black">{ar ? "المتطلبات والمؤهلات" : "Requirements & qualifications"}</h2><p className="whitespace-pre-wrap break-words text-sm leading-8 text-slate-600">{ar ? job.requirementsAr : job.requirementsEn}</p></section></div>
        <section id="apply" className={cardClass}><h2 className="mb-2 text-2xl font-black">{ar ? "قدّم الآن" : "Apply now"}</h2>{open ? <><p className="mb-7 text-sm leading-7 text-slate-500">{ar ? "عرّفنا بخبراتك وأرفق سيرتك الذاتية." : "Tell us about your experience and attach your CV."}</p><ApplicationForm locale={locale} jobId={job.id} /></> : <p className="mt-5 rounded-xl bg-amber-50 p-5 text-amber-900">{ar ? "انتهى التقديم لهذه الوظيفة. استعرض الوظائف المتاحة الأخرى." : "Applications for this position are closed. Explore our other open positions."}</p>}</section>
      </div>
    </div>
  </main>;
}
