"use client";
import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";
import { CHUNK_BYTES, FILE_MAX_BYTES, type FileKind } from "@/lib/training/types";
import { apiJson, inputClass, buttonClass, trainingError } from "@/lib/training/ui";
import FileField from "./FileField";

type Upload = { fingerprint: string; token: string; files: { kind: FileKind; file: File; offset: number }[] };
export default function TrainingForm({ locale, today }: { locale: string; today?: string }) {
  const ar = locale === "ar";
  const [type, setType] = useState("law"); const [cv, setCv] = useState<File | null>(null); const [letter, setLetter] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [reference, setReference] = useState(""); const [progress, setProgress] = useState(0);
  const pending = useRef<Upload | null>(null); const submitting = useRef(false);
  function changeFile(kind: FileKind, file: File | null) { (kind === "cv" ? setCv : setLetter)(file); pending.current = null; setProgress(0); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return;
    const files = [{ kind: "cv" as const, file: cv }, ...(letter ? [{ kind: "university_letter" as const, file: letter }] : [])];
    if (files.some(f => !f.file || !/\.pdf$/i.test(f.file.name) || f.file.size < 12 || f.file.size > FILE_MAX_BYTES)) { setError(trainingError("invalid_files", ar)); return; }
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = { ...values, type, field: type === "other" ? values.field : "", durationWeeks: Number(values.durationWeeks), consent: values.consent === "on", cv: undefined, university_letter: undefined,
      files: files.map(({ kind, file }) => ({ kind, name: file!.name, size: file!.size })) };
    const fingerprint = JSON.stringify(body);
    submitting.current = true; setBusy(true); setError("");
    try {
      if (!pending.current || pending.current.fingerprint !== fingerprint) {
        const data = await apiJson("/api/training/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: fingerprint });
        pending.current = { fingerprint, token: data.token, files: files.map(f => ({ kind: f.kind, file: f.file!, offset: 0 })) };
      }
      const upload = pending.current; const total = upload.files.reduce((n, f) => n + f.file.size, 0);
      for (const f of upload.files) {
        while (f.offset < f.file.size) {
          const end = Math.min(f.offset + CHUNK_BYTES, f.file.size);
          await apiJson(`/api/training/applications/${upload.token}?kind=${f.kind}&offset=${f.offset}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: f.file.slice(f.offset, end) });
          f.offset = end; setProgress(Math.round(upload.files.reduce((n, item) => n + item.offset, 0) / total * 100));
        }
      }
      const result = await apiJson(`/api/training/applications/${upload.token}`, { method: "POST" });
      setReference(result.reference); pending.current = null;
    } catch (e) {
      const code = e instanceof Error ? e.message : "unavailable";
      if (["upload_expired", "invalid_pdf", "invalid_files"].includes(code)) pending.current = null;
      setError(trainingError(code, ar));
    } finally { submitting.current = false; setBusy(false); }
  }
  if (reference) return <section role="status" className="rounded-3xl bg-emerald-50 p-8 text-center text-emerald-950"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" /><h2 className="mt-5 text-2xl font-black">{ar ? "تم استلام طلب التدريب" : "Training application received"}</h2><p className="mt-4 leading-8">{ar ? "احتفظ برقم الطلب. ستراجع الإدارة بياناتك وتتواصل معك عند الحاجة. استلام الطلب لا يعني القبول أو تأكيد موعد التدريب." : "Keep your reference. Our team will review your details and contact you if needed. Receipt does not mean acceptance or confirmation of a training date."}</p><p className="mt-6 text-sm">{ar ? "رقم الطلب" : "Application reference"}</p><p dir="ltr" className="mt-2 break-all rounded-xl bg-white p-4 font-mono font-bold">{reference}</p></section>;
  return <form onSubmit={submit} className="space-y-7">
    <fieldset disabled={busy} className="space-y-7">
      <legend className="text-2xl font-black">{ar ? "قدّم طلبك" : "Your application"}</legend>
      <p className="text-sm leading-7 text-slate-600">{ar ? "الحقول المعلّمة بنجمة مطلوبة. لا تحتاج إلى إنشاء حساب." : "Fields marked * are required. No account is needed."}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold">{ar ? "نوع التدريب *" : "Training type *"}<select className={inputClass} name="type" value={type} onChange={e => setType(e.target.value)}><option value="law">{ar ? "تدريب محاماة" : "Legal training"}</option><option value="other">{ar ? "أخرى" : "Other"}</option></select></label>
        {type === "other" ? <label className="text-sm font-bold">{ar ? "مجال التدريب *" : "Training field *"}<input name="field" required maxLength={300} className={inputClass} /></label> : null}
        {([["fullName", "الاسم الكامل", "Full name", "text", 160, "name"], ["email", "البريد الإلكتروني", "Email address", "email", 254, "email"], ["phone", "الهاتف مع رمز الدولة", "Phone with country code", "tel", 30, "tel"], ["location", "مكان الإقامة", "Place of residence", "text", 200, "off"], ["qualification", "المؤهل العلمي", "Qualification", "text", 300, "off"], ["specialization", "التخصص", "Specialization", "text", 300, "off"]] as const).map(([name, arabic, english, kind, max, complete]) => <label key={name} className="text-sm font-bold">{ar ? arabic : english} *<input name={name} type={kind} maxLength={max} autoComplete={complete} required dir={kind === "email" || kind === "tel" ? "ltr" : undefined} placeholder={name === "phone" ? "+973 3333 3333" : undefined} className={inputClass} /></label>)}
        <label className="text-sm font-bold">{ar ? "الجامعة (اختياري)" : "University (optional)"}<input name="university" maxLength={300} className={inputClass} /></label>
        <label className="text-sm font-bold">{ar ? "تاريخ البدء المطلوب *" : "Preferred start date *"}<input name="startDate" type="date" min={today} required className={inputClass} /></label>
        <label className="text-sm font-bold">{ar ? "مدة التدريب بالأسابيع *" : "Duration in weeks *"}<input name="durationWeeks" type="number" min={1} max={52} step={1} required className={inputClass} /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><FileField ar={ar} kind="cv" file={cv} onChange={f => changeFile("cv", f)} /><FileField ar={ar} kind="university_letter" file={letter} onChange={f => changeFile("university_letter", f)} /></div>
      <label className="block text-sm font-bold">{ar ? "ملاحظات (اختياري)" : "Notes (optional)"}<textarea name="message" maxLength={4000} rows={4} className={inputClass} /></label>
      <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="flex items-start gap-3 text-sm leading-7"><input name="consent" type="checkbox" required className="mt-2 h-4 w-4 shrink-0 accent-[#B4232A]" /><span>{ar ? "أوافق على استخدام بياناتي ومرفقاتي لدراسة طلب التدريب والتواصل معي بشأنه، وأؤكد صحة المعلومات المقدمة." : "I consent to my information and attachments being used to review my training application and contact me about it, and confirm that my information is accurate."}</span></label>
    </fieldset>
    <p className="flex items-start gap-2 text-xs leading-6 text-slate-600"><ShieldCheck className="mt-1 h-4 w-4 shrink-0" />{ar ? "المرفقات للإدارة المخوّلة فقط. لا ترفع معلومات حساسة غير لازمة للتقديم." : "Attachments are for authorized administrators only. Do not upload sensitive information unnecessary for your application."}</p>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm leading-7 text-red-800">{error}</p> : null}
    {busy ? <div role="status"><p className="mb-2 text-sm">{ar ? "جارٍ إرسال الطلب والتحقق من المرفقات" : "Uploading and checking attachments"} · {progress}%</p><progress value={progress} max={100} className="w-full accent-[#B4232A]" aria-label={ar ? "تقدم الرفع" : "Upload progress"} /></div> : null}
    <button disabled={busy} className={`${buttonClass} w-full py-4`}>{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}{ar ? "إرسال طلب التدريب" : "Submit training application"}</button>
  </form>;
}
