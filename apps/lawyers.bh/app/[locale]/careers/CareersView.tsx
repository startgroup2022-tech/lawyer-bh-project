import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, MapPin, Clock3, ArrowUpRight } from "lucide-react";
import type { Job } from "@/lib/careers/types";
import { cardClass, label } from "@/lib/careers/ui";

export default function CareersView({ locale, jobs, page, hasMore }: { locale: string; jobs: Job[]; page: number; hasMore: boolean }) {
  const ar = locale === "ar";
  return <main dir={ar ? "rtl" : "ltr"} className="bg-[#F3F6FA] text-[#082B67]">
    <section className="relative overflow-hidden bg-gradient-to-bl from-[#B4232A] to-[#571016] px-5 py-16 text-white md:py-24">
      <div className="pointer-events-none absolute -end-24 -top-24 h-96 w-96 rounded-full border-[50px] border-white/5" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl">
        <p className="mb-5 text-sm font-bold text-white/75">{ar ? "محامون البحرين · فرص مهنية" : "Lawyers.bh · Career opportunities"}</p>
        <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">{ar ? "مسيرتك القادمة تبدأ معنا" : "Your next chapter starts here"}</h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-white/85">{ar ? "انضم إلى فريق يعمل على تطوير الوصول إلى الخدمات القانونية. اكتشف فرصنا وقدّم خبراتك لبناء تجربة أفضل." : "Join a team improving access to legal services. Explore our opportunities and bring your experience to a meaningful next step."}</p>
        <a href="#positions" className="mt-8 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3 font-bold text-[#921b23]">{ar ? "استعرض الوظائف" : "Explore openings"}<ArrowLeft className="h-4 w-4 ltr:rotate-180" /></a>
      </div>
    </section>
    <section id="positions" className="mx-auto max-w-6xl px-5 py-14 md:py-20">
      <div className={`${cardClass} mb-8 flex flex-wrap items-center justify-between gap-4 p-6`}><p className="font-bold">{ar ? "تبحث عن فرصة تدريب؟" : "Looking for training?"}</p><Link href={`/${locale}/training`} className="rounded-xl bg-[#B4232A] px-5 py-3 font-bold text-white">{ar ? "قدّم طلب تدريب" : "Apply for training"}</Link></div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black tracking-widest text-[#B4232A]">{ar ? "فرص جديدة" : "OPEN OPPORTUNITIES"}</p><h2 className="mt-3 text-3xl font-black">{ar ? "الوظائف المتاحة" : "Open positions"}</h2></div><p className="text-sm text-slate-500">{ar ? "اختر الفرصة المناسبة لخبراتك وطموحك." : "Find a role that fits your skills and ambitions."}</p></div>
      {jobs.length ? <div className="grid gap-5 md:grid-cols-2">{jobs.map((job) => <article key={job.id} className={`${cardClass} group p-7`}>
        <div className="mb-5 flex items-center justify-between"><span className="rounded-2xl bg-red-50 p-3 text-[#B4232A]"><BriefcaseBusiness className="h-6 w-6" /></span><span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold">{label(job.employmentType, ar)}</span></div>
        <h3 className="text-xl font-black"><Link href={`/${locale}/careers/${job.slug}`} className="after:absolute focus-visible:outline-2 focus-visible:outline-red-600">{ar ? job.titleAr : job.titleEn}</Link></h3>
        <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-600">{ar ? job.descriptionAr : job.descriptionEn}</p>
        <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{ar ? job.cityAr : job.cityEn} · {label(job.workMode, ar)}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{ar ? "التقديم حتى" : "Apply by"} {new Date(job.closesAt).toLocaleDateString(ar ? "ar-BH" : "en-GB", { timeZone: "Asia/Bahrain" })}</span></div>
        <Link href={`/${locale}/careers/${job.slug}`} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#B4232A]">{ar ? "التفاصيل والتقديم" : "View role & apply"}<ArrowUpRight className="h-4 w-4 rtl:-rotate-90" /></Link>
      </article>)}</div> : <div className={`${cardClass} py-16 text-center`}><BriefcaseBusiness className="mx-auto h-12 w-12 text-slate-300" /><h3 className="mt-5 text-xl font-black">{ar ? "لا توجد وظائف متاحة حاليًا" : "No open positions right now"}</h3><p className="mt-3 text-sm text-slate-500">{ar ? "نُحدّث هذه الصفحة عند توفر فرص جديدة. يسعدنا اهتمامك بالانضمام إلينا." : "We update this page when opportunities become available. Thank you for your interest in joining us."}</p></div>}
      {(page > 1 || hasMore) && <nav aria-label={ar ? "صفحات الوظائف" : "Job pages"} className="mt-8 flex justify-center gap-5 text-sm font-bold">{page > 1 && <Link href={`/${locale}/careers?page=${page - 1}#positions`}>{ar ? "السابق" : "Previous"}</Link>}<span>{page}</span>{hasMore && <Link href={`/${locale}/careers?page=${page + 1}#positions`}>{ar ? "التالي" : "Next"}</Link>}</nav>}
    </section>
  </main>;
}
