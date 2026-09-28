"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Archive, BriefcaseBusiness, ExternalLink, Pencil, Plus, RotateCcw, Users, XCircle } from "lucide-react";
import { EMPLOYMENT_TYPES, JOB_STATUSES, type Job, type JobInput } from "@/lib/careers/types";
import { apiJson, buttonClass, cardClass, errorMessage, inputClass, label } from "@/lib/careers/ui";

export default function JobsAdmin({ locale, initialJobs, initialHasMore, countries }: { locale: string; initialJobs: Job[]; initialHasMore: boolean; countries: { code: string; nameAr: string; nameEn: string }[] }) {
  const ar = locale === "ar";
  const [jobs, setJobs] = useState(initialJobs); const [hasMore, setHasMore] = useState(initialHasMore); const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Job | null>(null); const [formKey, setFormKey] = useState(0); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function load(target = page) {
    const data = await apiJson(`/api/admin/careers/jobs?page=${target}`); setJobs(data.jobs); setHasMore(data.hasMore); setPage(target);
  }
  function reset() { setEditing(null); setFormKey((n) => n + 1); }
  function edit(job: Job) { setEditing(job); setFormKey((n) => n + 1); setMessage(null); document.getElementById("job-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (data.status === "published" && !confirm(ar ? "نشر هذه الوظيفة وإتاحتها للتقديم؟" : "Publish this position and open applications?")) return;
    setBusy(true); setMessage(null);
    try {
      await apiJson(editing ? `/api/admin/careers/jobs/${editing.id}` : "/api/admin/careers/jobs", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, closesAt: `${data.closesAt}T20:59:59.999Z`, version: editing?.version }) });
      reset(); await load(1); setMessage({ ok: true, text: ar ? "تم حفظ الوظيفة بنجاح." : "Position saved successfully." });
    } catch (error) { setMessage({ ok: false, text: errorMessage((error as Error).message, ar) }); } finally { setBusy(false); }
  }
  async function changeStatus(job: Job, status: JobInput["status"]) {
    if (busy || !confirm(ar ? `تغيير حالة «${job.titleAr}» إلى ${label(status, true)}؟ ستبقى طلبات المتقدمين محفوظة.` : `Set “${job.titleEn}” to ${label(status, false)}? Existing applications will be preserved.`)) return;
    setBusy(true); setMessage(null);
    try {
      await apiJson(`/api/admin/careers/jobs/${job.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...job, status }) });
      if (editing?.id === job.id) reset(); await load(); setMessage({ ok: true, text: ar ? "تم تحديث حالة الوظيفة." : "Position status updated." });
    } catch (error) { setMessage({ ok: false, text: errorMessage((error as Error).message, ar) }); } finally { setBusy(false); }
  }
  async function navigate(target: number) { setBusy(true); try { await load(target); } catch (error) { setMessage({ ok: false, text: errorMessage((error as Error).message, ar) }); } finally { setBusy(false); } }
  const smallButton = "inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-[#082B67] hover:bg-slate-100 disabled:opacity-50";
  return <main dir={ar ? "rtl" : "ltr"} className="min-h-screen px-5 py-10 text-[#082B67]">
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-bold text-[#B4232A]">{ar ? "إدارة التوظيف" : "RECRUITMENT"}</p><h1 className="mt-2 text-3xl font-black">{ar ? "إدارة الوظائف" : "Manage positions"}</h1><p className="mt-3 text-sm text-slate-500">{ar ? "أنشئ فرصًا واضحة، وتابع النشر والتقديم من مكان واحد." : "Create clear opportunities and manage their lifecycle in one place."}</p></div><div className="flex flex-wrap gap-3"><Link href={`/${locale}/admin/careers/applications`} className={`${smallButton} !bg-white`}><Users className="h-4 w-4" />{ar ? "المتقدمون" : "Applicants"}</Link><Link href={`/${locale}/careers`} target="_blank" rel="noopener noreferrer" className={`${smallButton} !bg-white`}><ExternalLink className="h-4 w-4" />{ar ? "صفحة الوظائف" : "Careers page"}</Link></div></header>
      {message && <p role={message.ok ? "status" : "alert"} className={`mb-6 rounded-xl p-4 text-sm ${message.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{message.text}</p>}
      <div className="grid items-start gap-7 lg:grid-cols-2">
        <section id="job-editor" className={`${cardClass} scroll-mt-32`}><div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-black">{editing ? (ar ? "تعديل الوظيفة" : "Edit position") : (ar ? "إضافة وظيفة" : "New position")}</h2>{editing && <button disabled={busy} className={smallButton} onClick={reset}><Plus className="h-4 w-4" />{ar ? "إضافة جديدة" : "New"}</button>}</div>
          <form key={formKey} onSubmit={save}>
            <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
              {([ ["titleAr", "المسمى الوظيفي بالعربية", "Title in Arabic", 180], ["titleEn", "المسمى الوظيفي بالإنجليزية", "Title in English", 180], ["cityAr", "المدينة بالعربية", "City in Arabic", 120], ["cityEn", "المدينة بالإنجليزية", "City in English", 120] ] as const).map(([name, arabic, english, max]) => <label key={name} className="text-sm font-bold">{ar ? arabic : english}<input name={name} defaultValue={editing?.[name] ?? ""} className={inputClass} required maxLength={max} dir={name.endsWith("Ar") ? "rtl" : "ltr"} /></label>)}
              <label className="text-sm font-bold">{ar ? "الدولة" : "Country"}<select name="country" defaultValue={editing?.country ?? "BH"} required className={inputClass}>{countries.map((country) => <option key={country.code} value={country.code}>{ar ? country.nameAr : country.nameEn}</option>)}</select></label>
              <label className="text-sm font-bold">{ar ? "نوع الدوام" : "Employment type"}<select name="employmentType" defaultValue={editing?.employmentType ?? "FULL_TIME"} className={inputClass}>{EMPLOYMENT_TYPES.map((v) => <option key={v} value={v}>{label(v, ar)}</option>)}</select></label>
              <label className="text-sm font-bold">{ar ? "نظام العمل" : "Work arrangement"}<select name="workMode" defaultValue={editing?.workMode ?? "onsite"} className={inputClass}>{["onsite", "remote"].map((v) => <option key={v} value={v}>{label(v, ar)}</option>)}</select></label>
              <label className="text-sm font-bold">{ar ? "الراتب والعملة (اختياري)" : "Salary and currency (optional)"}<input name="salary" defaultValue={editing?.salary ?? ""} maxLength={180} className={inputClass} /></label>
              {([ ["descriptionAr", "وصف الوظيفة بالعربية", "Description in Arabic", 12000], ["descriptionEn", "وصف الوظيفة بالإنجليزية", "Description in English", 12000], ["requirementsAr", "المتطلبات بالعربية", "Requirements in Arabic", 8000], ["requirementsEn", "المتطلبات بالإنجليزية", "Requirements in English", 8000] ] as const).map(([name, arabic, english, max]) => <label key={name} className="text-sm font-bold sm:col-span-2">{ar ? arabic : english}<textarea name={name} defaultValue={editing?.[name] ?? ""} rows={4} required maxLength={max} className={inputClass} dir={name.endsWith("Ar") ? "rtl" : "ltr"} /></label>)}
              <label className="text-sm font-bold">{ar ? "آخر يوم للتقديم" : "Last application day"}<input name="closesAt" type="date" defaultValue={editing?.closesAt.slice(0, 10) ?? ""} required className={inputClass} /><span className="mt-1 block text-xs font-normal text-slate-500">{ar ? "يغلق ١١:٥٩ مساءً بتوقيت البحرين." : "Closes at 11:59 PM Bahrain time."}</span></label>
              <label className="text-sm font-bold">{ar ? "الحالة" : "Status"}<select name="status" defaultValue={editing?.status ?? "draft"} className={inputClass}>{JOB_STATUSES.map((v) => <option key={v} value={v}>{label(v, ar)}</option>)}</select></label>
              <button className={`${buttonClass} sm:col-span-2`} disabled={busy}>{busy ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ الوظيفة" : "Save position")}</button>
            </fieldset>
          </form>
        </section>
        <section className="space-y-4"><h2 className="text-xl font-black">{ar ? "الوظائف المسجلة" : "Your positions"}</h2>{jobs.length ? jobs.map((job) => <article className={cardClass} key={job.id}><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black">{ar ? job.titleAr : job.titleEn}</h3><p className="mt-2 text-sm text-slate-500">{ar ? job.cityAr : job.cityEn} · {label(job.employmentType, ar)}</p></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${job.status === "published" && Date.parse(job.closesAt) > Date.now() ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{job.status === "published" && Date.parse(job.closesAt) <= Date.now() ? (ar ? "انتهى التقديم" : "Expired") : label(job.status, ar)}</span></div><div className="mt-5 flex flex-wrap gap-2"><button className={smallButton} disabled={busy} onClick={() => edit(job)}><Pencil className="h-4 w-4" />{ar ? "تعديل" : "Edit"}</button><Link className={smallButton} href={`/${locale}/admin/careers/applications?jobId=${job.id}`}><Users className="h-4 w-4" />{ar ? "المتقدمون" : "Applicants"}</Link>{job.status === "published" && <button disabled={busy} className={smallButton} onClick={() => changeStatus(job, "closed")}><XCircle className="h-4 w-4" />{ar ? "إغلاق" : "Close"}</button>}{job.status === "archived" ? <button disabled={busy} className={smallButton} onClick={() => changeStatus(job, "draft")}><RotateCcw className="h-4 w-4" />{ar ? "استعادة كمسودة" : "Restore draft"}</button> : <button disabled={busy} className={smallButton} onClick={() => changeStatus(job, "archived")}><Archive className="h-4 w-4" />{ar ? "أرشفة" : "Archive"}</button>}</div></article>) : <div className={`${cardClass} py-14 text-center`}><BriefcaseBusiness className="mx-auto mb-4 h-10 w-10 text-slate-300" /><p>{ar ? "ابدأ بإضافة أول وظيفة." : "Start by adding your first position."}</p></div>}
          <div className="flex items-center justify-center gap-4"><button className={smallButton} disabled={busy || page <= 1} onClick={() => navigate(page - 1)}>{ar ? "السابق" : "Previous"}</button><span className="text-sm">{page}</span><button className={smallButton} disabled={busy || !hasMore} onClick={() => navigate(page + 1)}>{ar ? "التالي" : "Next"}</button></div>
        </section>
      </div>
    </div>
  </main>;
}
