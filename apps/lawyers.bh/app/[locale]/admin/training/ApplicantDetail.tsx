"use client";
import { useState } from "react";
import { Download, X } from "lucide-react";
import { TRAINING_STATUSES, type TrainingApplication } from "@/lib/training/types";
import { apiJson, buttonClass, cardClass, inputClass, label, trainingError, typeLabel } from "@/lib/training/ui";
export default function ApplicantDetail({ application, ar, onClose, onUpdated, onReload }: { application: TrainingApplication; ar: boolean; onClose: () => void; onUpdated: (value: TrainingApplication) => void; onReload: () => void }) {
  const [status, setStatus] = useState(application.status), [notes, setNotes] = useState(application.notes);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  async function save(action?: "archive" | "restore") {
    if (busy) return;
    if (action && !window.confirm(ar ? (action === "archive" ? "أرشفة هذا الطلب؟ ستبقى بياناته ومرفقاته محفوظة." : "استعادة هذا الطلب من الأرشيف؟") : (action === "archive" ? "Archive this application? Its information and attachments will be retained." : "Restore this application from the archive?"))) return;
    setBusy(true); setError(""); setSaved(false);
    try {
      const data = await apiJson(`/api/admin/training/applications/${application.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action ? { version: application.version, action } : { version: application.version, status, notes }) });
      setStatus(data.application.status); setNotes(data.application.notes); onUpdated(data.application); setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "unavailable"); } finally { setBusy(false); }
  }
  const rows = [
    [ar ? "نوع التدريب" : "Training type", typeLabel(application.type, ar)], [ar ? "المجال" : "Field", application.field],
    [ar ? "البريد الإلكتروني" : "Email", application.email], [ar ? "الهاتف" : "Phone", application.phone],
    [ar ? "مكان الإقامة" : "Residence", application.location], [ar ? "الجامعة" : "University", application.university],
    [ar ? "المؤهل" : "Qualification", application.qualification], [ar ? "التخصص" : "Specialization", application.specialization],
    [ar ? "تاريخ البدء" : "Start date", application.startDate], [ar ? "المدة بالأسابيع" : "Duration in weeks", String(application.durationWeeks)],
    [ar ? "تاريخ التقديم" : "Submitted", new Date(application.createdAt).toLocaleString(ar ? "ar-BH" : "en-GB", { timeZone: "Asia/Bahrain" })],
    [ar ? "آخر تحديث" : "Last updated", new Date(application.updatedAt).toLocaleString(ar ? "ar-BH" : "en-GB", { timeZone: "Asia/Bahrain" })],
  ];
  return <section className={`${cardClass} min-w-0`} aria-label={ar ? "تفاصيل الطلب" : "Application details"}>
    <div className="flex items-start justify-between gap-4"><div><h2 className="break-words text-xl font-black">{application.fullName}</h2><p className="mt-2 text-sm text-slate-500" dir="ltr">{application.reference}</p></div><button onClick={onClose} disabled={busy} aria-label={ar ? "إغلاق التفاصيل" : "Close details"} className="rounded-xl bg-slate-100 p-3"><X size={18} /></button></div>
    {application.archivedAt && <p className="mt-4 rounded-xl bg-amber-50 p-3 font-bold text-amber-900">{ar ? "طلب مؤرشف" : "Archived application"}</p>}
    <dl className="my-6 grid gap-4 sm:grid-cols-2">{rows.filter(([, value]) => value).map(([title, value]) => <div key={title} className="min-w-0"><dt className="text-xs font-bold text-slate-500">{title}</dt><dd className="mt-1 break-words text-sm leading-6">{value}</dd></div>)}</dl>
    <h3 className="font-bold">{ar ? "ملاحظات المتقدم" : "Applicant notes"}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{application.message || (ar ? "لا توجد ملاحظات" : "No notes")}</p>
    <div className="my-6 flex flex-wrap gap-3">{application.files.map(file => <a key={file.kind} href={`/api/admin/training/applications/${application.id}/files/${file.kind}`} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold" download><Download size={16} />{file.kind === "cv" ? (ar ? "السيرة الذاتية" : "CV") : (ar ? "رسالة الجامعة" : "University letter")} · {(file.size / 1024).toFixed(0)} KB</a>)}</div>
    <form onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={busy} className="space-y-4"><label className="block text-sm font-bold">{ar ? "حالة الطلب" : "Application status"}<select className={inputClass} value={status} onChange={e => setStatus(e.target.value as typeof status)}>{TRAINING_STATUSES.map(value => <option key={value} value={value}>{label(value, ar)}</option>)}</select></label><label className="block text-sm font-bold">{ar ? "ملاحظات داخلية للإدارة" : "Internal admin notes"}<textarea className={inputClass} rows={5} maxLength={6000} value={notes} onChange={e => setNotes(e.target.value)} /></label><p className="text-xs leading-6 text-slate-500">{ar ? "تحديث الحالة لا يرسل رسالة تلقائية ولا ينشئ حسابًا للمتقدم." : "Changing status does not send an automatic message or create an applicant account."}</p><div className="flex flex-wrap gap-3"><button className={buttonClass}>{busy ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ التعديلات" : "Save changes")}</button><button type="button" className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold" onClick={() => void save(application.archivedAt ? "restore" : "archive")}>{application.archivedAt ? (ar ? "استعادة" : "Restore") : (ar ? "أرشفة" : "Archive")}</button></div></fieldset></form>
    {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{trainingError(error, ar)}{error === "stale_record" && <button onClick={onReload} className="ms-3 underline">{ar ? "تحديث التفاصيل" : "Reload details"}</button>}</div>}
    {saved && <p role="status" className="mt-4 text-sm text-green-800">{ar ? "تم حفظ التغييرات" : "Changes saved"}</p>}
  </section>;
}
