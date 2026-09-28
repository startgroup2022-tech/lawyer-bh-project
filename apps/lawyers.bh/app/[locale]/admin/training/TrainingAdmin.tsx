"use client";
import { useEffect, useRef, useState } from "react";
import { GraduationCap, Search } from "lucide-react";
import { TRAINING_STATUSES, type TrainingApplication, type TrainingSummary } from "@/lib/training/types";
import { apiJson, buttonClass, cardClass, inputClass, label, trainingError, typeLabel } from "@/lib/training/ui";
import ApplicantDetail from "./ApplicantDetail";
export default function TrainingAdmin({ locale, initialApplications, initialTotal }: { locale: string; initialApplications: TrainingSummary[]; initialTotal: number }) {
  const ar = locale === "ar";
  const [applications, setApplications] = useState(initialApplications), [total, setTotal] = useState(initialTotal);
  const [filters, setFilters] = useState({ query: "", type: "", status: "", archived: "false", page: 1 });
  const [detail, setDetail] = useState<TrainingApplication | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [revision, setRevision] = useState(0), [detailBusy, setDetailBusy] = useState(false);
  const detailRequest = useRef<AbortController | null>(null);
  useEffect(() => () => detailRequest.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError("");
    const query = new URLSearchParams({ ...filters, page: String(filters.page) });
    apiJson(`/api/admin/training/applications?${query}`, { signal: controller.signal }).then(data => { setApplications(data.applications); setTotal(data.total); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [filters, revision]);
  async function open(id: string) {
    detailRequest.current?.abort(); const controller = new AbortController(); detailRequest.current = controller;
    setDetailBusy(true); setError(""); setDetail(null);
    try { const data = await apiJson(`/api/admin/training/applications/${id}`, { signal: controller.signal }); setDetail(data.application); }
    catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "unavailable"); }
    finally { if (!controller.signal.aborted) setDetailBusy(false); }
  }
  return <main dir={ar ? "rtl" : "ltr"} className="mx-auto max-w-7xl space-y-6 px-5 py-10 text-[#082B67]">
    <header className={cardClass}><GraduationCap className="mb-4 text-[#B4232A]" size={32} /><h1 className="text-2xl font-black md:text-3xl">{ar ? "إدارة طلبات التدريب" : "Training applications"}</h1><p className="mt-3 text-sm leading-7 text-slate-500">{ar ? "مراجعة المتقدمين والمرفقات ومتابعة الحالات، بشكل مستقل عن طلبات التوظيف." : "Review applicants, private documents and progress, independently of job applications."}</p></header>
    <form className={`${cardClass} grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-5`} onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); setFilters({ query: String(data.get("query") || ""), type: String(data.get("type") || ""), status: String(data.get("status") || ""), archived: String(data.get("archived")), page: 1 }); }}>
      <label className="text-sm font-bold">{ar ? "الاسم أو البريد أو الرقم" : "Name, email or reference"}<input className={inputClass} name="query" maxLength={150} /></label>
      <label className="text-sm font-bold">{ar ? "نوع التدريب" : "Training type"}<select name="type" className={inputClass}><option value="">{ar ? "الكل" : "All"}</option><option value="law">{typeLabel("law", ar)}</option><option value="other">{typeLabel("other", ar)}</option></select></label>
      <label className="text-sm font-bold">{ar ? "الحالة" : "Status"}<select name="status" className={inputClass}><option value="">{ar ? "الكل" : "All"}</option>{TRAINING_STATUSES.map(status => <option key={status} value={status}>{label(status, ar)}</option>)}</select></label>
      <label className="text-sm font-bold">{ar ? "العرض" : "Show"}<select name="archived" className={inputClass}><option value="false">{ar ? "الطلبات الحالية" : "Active applications"}</option><option value="true">{ar ? "الأرشيف" : "Archive"}</option></select></label>
      <button className={buttonClass} disabled={busy}><Search size={16} />{ar ? "بحث" : "Search"}</button>
    </form>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{trainingError(error, ar)} <button className="underline" onClick={() => setRevision(n => n + 1)}>{ar ? "إعادة المحاولة" : "Retry"}</button></div>}
    <div className={`grid items-start gap-6 ${detail ? "xl:grid-cols-2" : ""}`}><section aria-busy={busy} className="min-w-0 space-y-3"><p role="status" className="text-sm text-slate-500">{busy ? (ar ? "جارٍ التحميل…" : "Loading…") : `${ar ? "الطلبات" : "Applications"}: ${total}`}</p>
      {!applications.length && !busy && <div className={`${cardClass} py-12 text-center`}>{ar ? "لا توجد طلبات تطابق البحث" : "No applications match your search"}</div>}
      {applications.map(application => <button key={application.id} onClick={() => void open(application.id)} className={`${cardClass} block w-full text-start`}><div className="flex flex-wrap justify-between gap-3"><h2 className="break-words font-black">{application.fullName}</h2><span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold">{label(application.status, ar)}</span></div><p dir="ltr" className="mt-3 break-all text-start text-sm text-slate-500">{application.reference} · {application.email}</p><p className="mt-2 text-sm">{typeLabel(application.type, ar)} · {new Date(application.createdAt).toLocaleDateString(ar ? "ar-BH" : "en-GB", { timeZone: "Asia/Bahrain" })}</p></button>)}
      <nav className="flex items-center justify-center gap-4 pt-4" aria-label={ar ? "صفحات الطلبات" : "Application pages"}><button className={buttonClass} disabled={busy || filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>{ar ? "السابق" : "Previous"}</button><span>{filters.page}</span><button className={buttonClass} disabled={busy || filters.page * 25 >= total} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>{ar ? "التالي" : "Next"}</button></nav>
    </section>{detailBusy && <p role="status">{ar ? "جارٍ تحميل التفاصيل…" : "Loading details…"}</p>}{detail && <ApplicantDetail key={detail.id} application={detail} ar={ar} onClose={() => setDetail(null)} onReload={() => void open(detail.id)} onUpdated={value => { setDetail(value); setRevision(n => n + 1); }} />}</div>
  </main>;
}
