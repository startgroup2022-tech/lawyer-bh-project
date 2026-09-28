"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Upload, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { CV_CHUNK_BYTES, CV_MAX_BYTES } from "@/lib/careers/types";
import { apiJson, buttonClass, inputClass, errorMessage } from "@/lib/careers/ui";

export default function ApplicationForm({ locale, jobId }: { locale: string; jobId: string }) {
  const ar = locale === "ar";
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState(false); const [progress, setProgress] = useState(0);
  const pending = useRef<{ fingerprint: string; file: File; token: string; offset: number } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget); const file = form.get("cv");
    if (!(file instanceof File) || !/\.pdf$/i.test(file.name) || file.size < 12 || file.size > CV_MAX_BYTES) { setError(errorMessage("invalid_cv_size", ar)); return; }
    const body = { jobId, fullName: form.get("fullName"), email: form.get("email"), phone: form.get("phone"), location: form.get("location"), qualification: form.get("qualification"), yearsExperience: Number(form.get("yearsExperience")), message: form.get("message"), consent: form.get("consent") === "on", website: form.get("website"), cvName: file.name, cvSize: file.size };
    const fingerprint = JSON.stringify(body);
    setBusy(true); setError("");
    try {
      // A retry reuses its capability and offset, including after an uncertain final response.
      if (!pending.current || pending.current.fingerprint !== fingerprint || pending.current.file.lastModified !== file.lastModified) {
        const data = await apiJson("/api/careers/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: fingerprint });
        pending.current = { fingerprint, file, token: data.token, offset: 0 };
      }
      const upload = pending.current!;
      while (upload.offset < file.size) {
        const end = Math.min(upload.offset + CV_CHUNK_BYTES, file.size);
        await apiJson(`/api/careers/applications/${upload.token}?offset=${upload.offset}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: file.slice(upload.offset, end) });
        upload.offset = end; setProgress(Math.round(end / file.size * 100));
      }
      await apiJson(`/api/careers/applications/${upload.token}`, { method: "POST" });
      pending.current = null; setSuccess(true);
    } catch (e) {
      const code = e instanceof Error ? e.message : "unavailable";
      if (["upload_expired", "invalid_pdf", "job_closed"].includes(code)) pending.current = null;
      setError(errorMessage(code, ar));
    } finally { setBusy(false); }
  }
  if (success) return <div role="status" className="rounded-3xl bg-emerald-50 p-8 text-center text-emerald-900"><CheckCircle2 className="mx-auto h-12 w-12" /><h2 className="mt-4 text-2xl font-black">{ar ? "تم استلام طلبك بنجاح" : "Your application has been received"}</h2><p className="mt-4 leading-7">{ar ? "شكرًا لاهتمامك. سيطّلع فريقنا على طلبك ويتواصل معك إذا كنت مناسبًا للفرصة." : "Thank you for your interest. Our team will review your application and contact you if your profile matches the role."}</p></div>;
  return <form onSubmit={submit} className="space-y-5">
    <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
      {([ ["fullName", ar ? "الاسم الكامل" : "Full name", "text", 160], ["email", ar ? "البريد الإلكتروني" : "Email address", "email", 254], ["phone", ar ? "رقم الهاتف" : "Phone number", "tel", 30], ["location", ar ? "مكان الإقامة" : "Place of residence", "text", 200], ["qualification", ar ? "المؤهل العلمي" : "Qualification", "text", 300] ] as const).map(([name, title, type, maxLength]) => <label key={name} className="text-sm font-bold">{title}<input className={inputClass} name={name} type={type} maxLength={maxLength} required dir={type === "email" || type === "tel" ? "ltr" : undefined} autoComplete={name === "fullName" ? "name" : name === "phone" ? "tel" : name === "email" ? "email" : "off"} /></label>)}
      <label className="text-sm font-bold">{ar ? "سنوات الخبرة" : "Years of experience"}<input className={inputClass} name="yearsExperience" type="number" min={0} max={80} step={1} required /></label>
      <label className="text-sm font-bold sm:col-span-2">{ar ? "نبذة أو رسالة تعرّف بها عن نفسك (اختياري)" : "Tell us about yourself (optional)"}<textarea className={inputClass} name="message" rows={4} maxLength={4000} /></label>
      <label className="rounded-2xl bg-slate-50 p-5 text-sm font-bold sm:col-span-2"><span className="flex items-center gap-2"><Upload className="h-5 w-5 text-[#B4232A]" />{ar ? "السيرة الذاتية" : "Your CV"}</span><span className="mt-2 block text-xs font-normal text-slate-500">{ar ? "PDF غير محمي بكلمة مرور · حتى ٥ ميجابايت" : "PDF, not password protected · up to 5 MB"}</span><input name="cv" type="file" accept="application/pdf,.pdf" required className="mt-4 w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-bold file:text-[#082B67]" onChange={() => { pending.current = null; setProgress(0); }} /></label>
      <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="flex items-start gap-3 text-sm leading-7 sm:col-span-2"><input type="checkbox" name="consent" required className="mt-2 accent-[#B4232A]" /><span>{ar ? "أوافق على استخدام بياناتي وسيرتي الذاتية لمراجعة طلب التوظيف والتواصل معي بشأنه، وأؤكد صحة البيانات المقدمة." : "I consent to my information and CV being used to review my job application and contact me about it, and confirm that the information is accurate."}</span></label>
    </fieldset>
    <p className="flex items-center gap-2 text-xs leading-6 text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0" />{ar ? "بياناتك وسيرتك الذاتية خاصة بفريق التوظيف المخوّل فقط." : "Your details and CV are private to the authorized recruitment team."}</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {busy && <p role="status" className="text-sm">{ar ? "جارٍ إرسال الطلب" : "Submitting application"} · {progress}%</p>}
    <button disabled={busy} className={`${buttonClass} w-full`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{ar ? "إرسال طلب التوظيف" : "Submit application"}</button>
    <p className="text-center text-xs text-slate-500">{ar ? "لا تحتاج إلى إنشاء حساب للتقديم." : "No account is required to apply."} <Link href={`/${locale}/terms`} className="underline">{ar ? "الشروط العامة" : "Terms"}</Link></p>
  </form>;
}
