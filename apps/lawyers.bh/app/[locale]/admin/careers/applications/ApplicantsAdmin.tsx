"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Download, Search, Users, BriefcaseBusiness } from "lucide-react";
import { APPLICATION_STATUSES, type Application } from "@/lib/careers/types";
import { apiJson, buttonClass, cardClass, errorMessage, inputClass, label } from "@/lib/careers/ui";

type JobOption = { id: string; titleAr: string; titleEn: string };
export default function ApplicantsAdmin({ locale, jobs, initialApplications, initialTotal, initialJobId }: { locale: string; jobs: JobOption[]; initialApplications: Application[]; initialTotal: number; initialJobId: string }) {
  const ar = locale === "ar";
  const [applications, setApplications] = useState(initialApplications); const [total, setTotal] = useState(initialTotal);
  const [jobId, setJobId] = useState(initialJobId); const [status, setStatus] = useState(""); const [query, setQuery] = useState(""); const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Application | null>(null); const [error, setError] = useState(""); const [revision, setRevision] = useState(0);
  const requestKey = JSON.stringify([jobId, status, query, page, revision]);
  const [resolvedKey, setResolvedKey] = useState(requestKey);
  const busy = requestKey !== resolvedKey;
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    const params = new URLSearchParams({ jobId, status, query, page: String(page) });
    apiJson(`/api/admin/careers/applications?${params}`, { signal: controller.signal }).then((data) => {
      if (!active) return; setError(""); setApplications(data.applications); setTotal(data.total); setSelected((current) => data.applications.find((a: Application) => a.id === current?.id) ?? null);
    }).catch((e) => { if (active) setError(errorMessage(e.message, ar)); }).finally(() => { if (active) setResolvedKey(requestKey); });
    return () => { active = false; controller.abort(); };
  }, [jobId, status, query, page, revision, ar, requestKey]);
  return <main dir={ar ? "rtl" : "ltr"} className="min-h-screen px-5 py-10 text-[#082B67]"><div className="mx-auto max-w-7xl">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-bold text-[#B4232A]">{ar ? "فريقك القادم" : "YOUR NEXT TEAM MEMBERS"}</p><h1 className="mt-2 text-3xl font-black">{ar ? "المتقدمون للوظائف" : "Job applicants"}</h1><p className="mt-3 text-sm text-slate-500">{ar ? "راجع الخبرات وتابع كل طلب بسرية ووضوح." : "Review experience and manage every application privately."}</p></div><Link href={`/${locale}/admin/careers`} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold shadow-sm"><BriefcaseBusiness className="h-4 w-4" />{ar ? "إدارة الوظائف" : "Manage positions"}</Link></header>
    <div className={`${cardClass} mb-7 grid gap-4 md:grid-cols-3`}>
      <label className="text-sm font-bold">{ar ? "الوظيفة" : "Position"}<select name="jobId" className={inputClass} value={jobId} onChange={(e) => { setJobId(e.target.value); setPage(1); setSelected(null); }}><option value="">{ar ? "جميع الوظائف" : "All positions"}</option>{jobs.map((j) => <option value={j.id} key={j.id}>{ar ? j.titleAr : j.titleEn}</option>)}</select></label>
      <label className="text-sm font-bold">{ar ? "حالة الطلب" : "Application status"}<select name="status" className={inputClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); setSelected(null); }}><option value="">{ar ? "جميع الحالات" : "All statuses"}</option>{APPLICATION_STATUSES.map((s) => <option value={s} key={s}>{label(s, ar)}</option>)}</select></label>
      <form onSubmit={(e) => { e.preventDefault(); setQuery(search); setPage(1); setSelected(null); }}><label className="text-sm font-bold">{ar ? "الاسم أو البريد الإلكتروني" : "Name or email"}<div className="flex items-end gap-2"><input className={inputClass} maxLength={150} value={search} onChange={(e) => setSearch(e.target.value)} /><button className={buttonClass} aria-label={ar ? "بحث" : "Search"}><Search className="h-5 w-5" /></button></div></label></form>
    </div>
    {error && <div role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-900">{error}<button onClick={() => setRevision((v) => v + 1)} className="ms-3 underline">{ar ? "إعادة المحاولة" : "Retry"}</button></div>}
    <div className="grid items-start gap-7 lg:grid-cols-2"><section><p className="mb-4 text-sm font-bold" role="status">{busy ? (ar ? "جارٍ التحميل…" : "Loading…") : `${total} ${ar ? "طلب" : "applications"}`}</p><div className="space-y-3">{applications.map((app) => <button disabled={busy} key={app.id} onClick={() => setSelected(app)} className={`${cardClass} w-full text-start ${selected?.id === app.id ? "ring-2 ring-[#B4232A]/40" : ""}`}><div className="flex items-center justify-between gap-3"><h2 className="font-black text-[#082B67]">{app.fullName}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-[#082B67]">{label(app.status, ar)}</span></div><p className="mt-2 text-sm text-slate-600">{ar ? app.jobTitleAr : app.jobTitleEn}</p><p className="mt-2 break-all text-xs text-slate-500">{app.email}</p></button>)}{!applications.length && <div className={`${cardClass} py-14 text-center`}><Users className="mx-auto mb-4 h-10 w-10 text-slate-300" />{ar ? "لا توجد طلبات مطابقة" : "No matching applications"}</div>}</div><div className="mt-5 flex items-center justify-center gap-4 text-sm font-bold"><button disabled={busy || page === 1} onClick={() => setPage(page - 1)} className="rounded-xl bg-white px-4 py-2 disabled:opacity-40">{ar ? "السابق" : "Previous"}</button><span>{page}</span><button disabled={busy || page * 25 >= total} onClick={() => setPage(page + 1)} className="rounded-xl bg-white px-4 py-2 disabled:opacity-40">{ar ? "التالي" : "Next"}</button></div></section>
      {selected ? <ApplicantDetail key={`${selected.id}-${selected.version}`} application={selected} ar={ar} onSaved={() => setRevision((v) => v + 1)} /> : <div className={`${cardClass} py-16 text-center text-sm text-slate-500`}>{ar ? "اختر متقدمًا لعرض البيانات والسيرة الذاتية." : "Select an applicant to view their details and CV."}</div>}
    </div>
  </div></main>;
}
function ApplicantDetail({ application: app, ar, onSaved }: { application: Application; ar: boolean; onSaved: () => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget)); setBusy(true); setError(""); setSaved(false);
    try { await apiJson(`/api/admin/careers/applications/${app.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, version: app.version }) }); setSaved(true); onSaved(); } catch (e) { setError(errorMessage((e as Error).message, ar)); } finally { setBusy(false); }
  }
  return <section className={cardClass}><h2 className="text-2xl font-black text-[#082B67]">{app.fullName}</h2><p className="mt-2 text-sm text-[#B4232A]">{ar ? app.jobTitleAr : app.jobTitleEn}</p><dl className="my-6 grid gap-4 sm:grid-cols-2">{[[ar ? "البريد" : "Email", app.email], [ar ? "الهاتف" : "Phone", app.phone], [ar ? "مكان الإقامة" : "Residence", app.location], [ar ? "المؤهل" : "Qualification", app.qualification], [ar ? "سنوات الخبرة" : "Years of experience", String(app.yearsExperience)], [ar ? "تاريخ التقديم" : "Applied on", new Date(app.createdAt).toLocaleDateString(ar ? "ar-BH" : "en-GB", { timeZone: "Asia/Bahrain" })]].map(([title, value]) => <div key={title}><dt className="text-xs text-slate-500">{title}</dt><dd className="mt-1 break-words text-sm font-bold text-[#082B67]">{value}</dd></div>)}</dl>{app.message && <p className="mb-6 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-7">{app.message}</p>}
    <a href={`/api/admin/careers/applications/${app.id}/cv`} className={buttonClass} download><Download className="h-4 w-4" />{ar ? "تنزيل السيرة الذاتية" : "Download CV"}</a>
    <form onSubmit={save} className="mt-7 space-y-5"><fieldset disabled={busy} className="space-y-5"><label className="block text-sm font-bold">{ar ? "حالة الطلب" : "Application status"}<select name="status" defaultValue={app.status} className={inputClass}>{APPLICATION_STATUSES.map((s) => <option value={s} key={s}>{label(s, ar)}</option>)}</select></label><label className="block text-sm font-bold">{ar ? "ملاحظات داخلية" : "Internal notes"}<textarea name="notes" defaultValue={app.notes} rows={5} maxLength={6000} className={inputClass} /><span className="mt-1 block text-xs font-normal text-slate-500">{ar ? "لا تُرسل هذه الملاحظات أو تغييرات الحالة إلى المتقدم." : "Notes and status changes are not sent to the applicant."}</span></label><button className={`${buttonClass} w-full`} disabled={busy}>{ar ? "حفظ المتابعة" : "Save review"}</button></fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{saved && <p role="status" className="text-sm text-emerald-700">{ar ? "تم الحفظ." : "Saved."}</p>}</form>
  </section>;
}
