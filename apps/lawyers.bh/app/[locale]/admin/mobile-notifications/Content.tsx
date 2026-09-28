"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, CheckCircle2, Loader2, Send, ShieldAlert, Users, X } from "lucide-react";
import AdminPagination from "../_components/AdminPagination";
import { paginateItems } from "../_components/pagination";

type Audience = "clients" | "active_lawyers" | "pending_lawyers" | "all_lawyers" | "everyone";
type History = { id: string; audience: Audience; state: string; titleAr: string; titleEn: string; targeted: number; successful: number; failed: number; pruned: number; createdAt: string };
const audiences: Array<{ key: Audience; ar: string; en: string }> = [
  { key: "clients", ar: "الأعضاء", en: "Members" },
  { key: "active_lawyers", ar: "المحامون الفعّالون", en: "Active lawyers" },
  { key: "pending_lawyers", ar: "المحامون قيد الانتظار", en: "Pending lawyers" },
  { key: "all_lawyers", ar: "كل المحامين", en: "All lawyers" },
  { key: "everyone", ar: "جميع المستخدمين", en: "Everyone" },
];
const fieldClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#082B67] outline-none focus:border-[#B4232A] focus:ring-4 focus:ring-red-50";

export default function MobileNotificationsContent({ isAr }: { isAr: boolean }) {
  const [audience, setAudience] = useState<Audience>("clients");
  const [form, setForm] = useState({ titleAr: "", bodyAr: "", titleEn: "", bodyEn: "" });
  const [count, setCount] = useState<number | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [page, setPage] = useState(1);
  const pagination = paginateItems(history, page);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/admin/mobile-notifications?audience=${audience}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setCount(data.count); setHistory(data.history ?? []); }
    else setMessage({ ok: false, text: isAr ? "تعذر تحميل عدد الأجهزة." : "Could not load device count." });
    setLoading(false);
  }, [audience, isAr]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/mobile-notifications?audience=${audience}`, { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (response.ok) { setCount(data.count); setHistory(data.history ?? []); }
        else setMessage({ ok: false, text: isAr ? "تعذر تحميل عدد الأجهزة." : "Could not load device count." });
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [audience, isAr]);
  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setIdempotencyKey(null); setMessage(null);
  }
  const valid = form.titleAr.trim().length > 0 && form.titleAr.trim().length <= 100 && form.titleEn.trim().length > 0 && form.titleEn.trim().length <= 100 && form.bodyAr.trim().length > 0 && form.bodyAr.trim().length <= 500 && form.bodyEn.trim().length > 0 && form.bodyEn.trim().length <= 500 && (count ?? 0) > 0;
  function openConfirmation() {
    if (!valid) return;
    if (!idempotencyKey) setIdempotencyKey(crypto.randomUUID());
    setConfirming(true);
  }
  async function sendNow() {
    if (sending || !idempotencyKey) return;
    setSending(true); setMessage(null);
    const response = await fetch("/api/admin/mobile-notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audience, ...form, confirmed: true, idempotencyKey }) });
    const data = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) { setMessage({ ok: false, text: isAr ? "تعذر الإرسال. يمكنك إعادة المحاولة بأمان." : "Sending failed. You can retry safely." }); return; }
    setConfirming(false); setIdempotencyKey(null);
    setMessage({ ok: true, text: isAr ? `تم الإرسال: ${data.successful} ناجح، ${data.failed} فاشل.` : `Sent: ${data.successful} successful, ${data.failed} failed.` });
    await loadPreview();
  }
  const label = (key: Audience) => audiences.find((item) => item.key === key)?.[isAr ? "ar" : "en"] ?? key;
  return <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#F6F8FB] px-4 py-8 text-[#082B67] sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="rounded-[2rem] bg-[#082B67] p-7 text-white shadow-xl sm:p-10"><div className="flex items-center gap-4"><span className="rounded-2xl bg-white/10 p-3"><BellRing /></span><div><h1 className="text-2xl font-black sm:text-3xl">{isAr ? "إرسال إشعارات التطبيق" : "Send app notifications"}</h1><p className="mt-2 text-sm text-blue-100">{isAr ? "إشعارات فورية لأجهزة iPhone المسجلة فقط" : "Immediate notifications to registered iPhones only"}</p></div></div></header>
      {message ? <div className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{message.text}</div> : null}
      <div className="mt-7 grid gap-7 lg:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-[2rem] border border-transparent bg-white transition hover:border-[#B4232A] focus-within:border-[#B4232A] p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-black">{isAr ? "الفئة المستهدفة" : "Target audience"}</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{audiences.map((item) => <button type="button" key={item.key} onClick={() => { setLoading(true); setAudience(item.key); setIdempotencyKey(null); }} className={`rounded-2xl border px-4 py-3 text-start text-sm font-extrabold transition ${audience === item.key ? "border-[#B4232A] bg-red-50 text-[#B4232A]" : "border-slate-200 hover:border-slate-300"}`}>{isAr ? item.ar : item.en}</button>)}</div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-blue-50 p-4"><Users className="h-5 w-5" /><span className="text-sm font-bold">{loading ? (isAr ? "جارٍ الحساب…" : "Counting…") : `${count ?? 0} ${isAr ? "جهاز متاح" : "reachable devices"}`}</span></div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Field label="العنوان بالعربية" count={`${form.titleAr.length}/100`}><input aria-label="العنوان بالعربية" maxLength={100} value={form.titleAr} onChange={(e) => update("titleAr", e.target.value)} className={fieldClass} dir="rtl" /></Field>
            <Field label="English title" count={`${form.titleEn.length}/100`}><input aria-label="English title" maxLength={100} value={form.titleEn} onChange={(e) => update("titleEn", e.target.value)} className={fieldClass} dir="ltr" /></Field>
            <Field label="النص بالعربية" count={`${form.bodyAr.length}/500`}><textarea aria-label="النص بالعربية" maxLength={500} rows={5} value={form.bodyAr} onChange={(e) => update("bodyAr", e.target.value)} className={fieldClass} dir="rtl" /></Field>
            <Field label="English body" count={`${form.bodyEn.length}/500`}><textarea aria-label="English body" maxLength={500} rows={5} value={form.bodyEn} onChange={(e) => update("bodyEn", e.target.value)} className={fieldClass} dir="ltr" /></Field>
          </div>
          <button type="button" disabled={!valid || sending} onClick={openConfirmation} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B4232A] px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" />{isAr ? "مراجعة وإرسال" : "Review and send"}</button>
        </section>
        <aside className="space-y-5"><Preview title={form.titleAr || "عنوان الإشعار"} body={form.bodyAr || "سيظهر نص الإشعار هنا."} dir="rtl" /><Preview title={form.titleEn || "Notification title"} body={form.bodyEn || "The notification body will appear here."} dir="ltr" />
          <section className="rounded-[2rem] border border-transparent bg-white transition hover:border-[#B4232A] focus-within:border-[#B4232A] p-6 shadow-sm"><h2 className="font-black">{isAr ? "آخر عمليات الإرسال" : "Recent sends"}</h2><div className="mt-4 space-y-3">{history.length === 0 ? <p className="text-sm text-slate-400">{isAr ? "لا يوجد سجل بعد." : "No sends yet."}</p> : pagination.items.map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-xs"><div className="flex justify-between gap-2 font-bold"><span>{label(item.audience)}</span><span>{item.successful}/{item.targeted}</span></div><p className="mt-1 truncate text-slate-500">{isAr ? item.titleAr : item.titleEn}</p></div>)}</div></section>
          <AdminPagination isAr={isAr} currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
        </aside>
      </div>
    </div>
    {confirming ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl"><div className="flex justify-between"><span className="rounded-2xl bg-red-50 p-3 text-[#B4232A]"><ShieldAlert /></span><button aria-label={isAr ? "إغلاق" : "Close"} onClick={() => setConfirming(false)}><X /></button></div><h2 className="mt-5 text-xl font-black">{isAr ? "تأكيد الإرسال الفوري" : "Confirm immediate send"}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{isAr ? `سيُرسل الإشعار الآن إلى ${count ?? 0} جهاز ضمن فئة «${label(audience)}». لا يمكن التراجع عن الإرسال بعد الضغط على زر التأكيد.` : `This will send now to ${count ?? 0} devices in “${label(audience)}”. Sending cannot be undone after confirmation.`}</p><div className="mt-6 flex gap-3"><button disabled={sending} onClick={() => setConfirming(false)} className="flex-1 rounded-2xl border p-3 text-sm font-bold">{isAr ? "رجوع" : "Back"}</button><button disabled={sending} onClick={sendNow} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#B4232A] p-3 text-sm font-black text-white disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{isAr ? "تأكيد الإرسال" : "Confirm send"}</button></div></section></div> : null}
  </main>;
}

function Field({ label, count, children }: { label: string; count: string; children: React.ReactNode }) { return <label><span className="mb-2 flex justify-between text-sm font-extrabold"><span>{label}</span><span className="text-xs text-slate-400">{count}</span></span>{children}</label>; }
function Preview({ title, body, dir }: { title: string; body: string; dir: "rtl" | "ltr" }) { return <section dir={dir} className="rounded-[2rem] border border-transparent bg-white transition hover:border-[#B4232A] focus-within:border-[#B4232A] p-6 shadow-sm"><p className="text-[11px] font-bold text-slate-400">LAWYERS.BH</p><h3 className="mt-3 font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{body}</p></section>; }
