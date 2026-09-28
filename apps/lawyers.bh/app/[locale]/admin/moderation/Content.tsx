"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { moderationCategoryLabel, moderationStatusLabel } from "./presentation";

type Report = {
  id: string; requestId: string | null; reportedName?: string | null;
  reporterRole: string; reportedRole: string; category: string;
  description: string | null; status: string; createdAt: string;
};
type Detail = Report & {
  evidence: Array<{ id: string; senderRole: string; body: string; createdAt: string }>;
  actions: Array<{ id: string; action: string; internalReason: string; createdAt: string }>;
};

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#B4232A]";

export default function ModerationContent({ isAr }: { isAr: boolean }) {
  const [status, setStatus] = useState("open");
  const [items, setItems] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [action, setAction] = useState("warning");
  const [internalReason, setInternalReason] = useState("");
  const [publicMessageAr, setPublicMessageAr] = useState("");
  const [publicMessageEn, setPublicMessageEn] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/moderation/reports?status=${status}`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setItems(data.items ?? []);
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  const open = async (id: string) => {
    const response = await fetch(`/api/admin/moderation/reports/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setSelected(data.report);
  };

  const submit = async () => {
    if (!selected) return;
    setBusy(true); setMessage("");
    const response = await fetch(`/api/admin/moderation/reports/${selected.id}/actions`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, internalReason, publicMessageAr, publicMessageEn, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setMessage(isAr ? "تم حفظ الإجراء في سجل الإشراف." : "Moderation action saved.");
      await load(); await open(selected.id);
    } else setMessage(isAr ? `تعذر تنفيذ الإجراء: ${data.error ?? "خطأ"}` : `Could not apply action: ${data.error ?? "error"}`);
    setBusy(false);
  };

  return <main dir={isAr ? "rtl" : "ltr"} className="mx-auto max-w-7xl space-y-6 p-5 text-[#082B67]">
    <header className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3"><ShieldAlert className="text-[#B4232A]" /><h1 className="text-2xl font-black">{isAr ? "بلاغات وسلامة المحادثة" : "Chat Reports & Safety"}</h1></div>
      <p className="mt-2 text-sm text-slate-500">{isAr ? "مراجعة البلاغات واتخاذ إجراءات موثقة باستخدام حساب الإدارة الحالي." : "Review reports and take audited actions using your existing admin account."}</p>
    </header>
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="open">{isAr ? "المفتوحة" : "Open"}</option><option value="actioned">{isAr ? "تم اتخاذ إجراء" : "Actioned"}</option><option value="dismissed">{isAr ? "المرفوضة" : "Dismissed"}</option><option value="all">{isAr ? "الكل" : "All"}</option>
        </select>
        <div className="mt-4 space-y-3">{items.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">{isAr ? "لا توجد بلاغات." : "No reports."}</p> : items.map((item) => <button key={item.id} onClick={() => void open(item.id)} className="w-full rounded-2xl border border-slate-100 p-4 text-start hover:border-[#B4232A]">
          <div className="flex justify-between gap-2"><strong>{moderationCategoryLabel(item.category, isAr)}</strong><span className="text-xs text-slate-500">{moderationStatusLabel(item.status, isAr)}</span></div>
          <p className="mt-1 text-sm">{item.reportedName || item.reportedRole}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString(isAr ? "ar-BH" : "en-GB")}</p>
        </button>)}</div>
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-sm">{!selected ? <p className="p-12 text-center text-slate-500">{isAr ? "اختر بلاغًا لعرض التفاصيل." : "Select a report to review."}</p> : <div className="space-y-5">
        <div><h2 className="text-xl font-black">{moderationCategoryLabel(selected.category, isAr)}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{selected.description || (isAr ? "بدون وصف إضافي" : "No additional description")}</p><p className="mt-2 text-xs text-slate-400">{isAr ? "رقم الطلب" : "Request"}: {selected.requestId || "-"}</p></div>
        <div className="rounded-2xl bg-slate-50 p-4"><h3 className="font-bold">{isAr ? "سياق المحادثة المحفوظ وقت البلاغ" : "Conversation context captured at report time"}</h3><div className="mt-3 max-h-64 space-y-2 overflow-auto">{selected.evidence.map((entry) => <div key={entry.id} className="rounded-xl bg-white p-3 text-sm"><b>{entry.senderRole}</b><p className="mt-1 whitespace-pre-wrap">{entry.body}</p></div>)}</div></div>
        <div className="grid gap-3 md:grid-cols-2"><select className={inputClass} value={action} onChange={(event) => setAction(event.target.value)}>
          <option value="warning">{isAr ? "تحذير المستخدم" : "Warn user"}</option><option value="chat_suspension">{isAr ? "تعطيل المحادثة مؤقتًا" : "Temporarily disable chat"}</option><option value="account_suspension">{isAr ? "إيقاف الحساب" : "Suspend account"}</option><option value="dismissal">{isAr ? "رفض البلاغ" : "Dismiss report"}</option><option value="chat_reactivation">{isAr ? "إعادة تفعيل المحادثة" : "Reactivate chat"}</option><option value="account_reactivation">{isAr ? "إعادة تفعيل الحساب" : "Reactivate account"}</option>
        </select><input className={inputClass} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} type="datetime-local" aria-label={isAr ? "تاريخ انتهاء التعطيل" : "Suspension expiry"} /></div>
        <textarea className={inputClass} value={internalReason} onChange={(event) => setInternalReason(event.target.value)} placeholder={isAr ? "السبب الداخلي المطلوب" : "Required internal reason"} />
        <textarea className={inputClass} value={publicMessageAr} onChange={(event) => setPublicMessageAr(event.target.value)} placeholder="الرسالة الظاهرة للمستخدم بالعربية" />
        <textarea className={inputClass} value={publicMessageEn} onChange={(event) => setPublicMessageEn(event.target.value)} placeholder="Public user message in English" />
        <button disabled={busy} onClick={() => void submit()} className="rounded-xl bg-[#B4232A] px-6 py-3 font-bold text-white disabled:opacity-50">{busy ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "تأكيد الإجراء" : "Confirm action")}</button>
        {message && <p className="text-sm font-bold">{message}</p>}
        <div><h3 className="font-bold">{isAr ? "سجل الإجراءات" : "Audit timeline"}</h3><div className="mt-2 space-y-2">{selected.actions.map((entry) => <div key={entry.id} className="rounded-xl border border-slate-100 p-3 text-sm"><b>{entry.action}</b><p>{entry.internalReason}</p><small>{new Date(entry.createdAt).toLocaleString(isAr ? "ar-BH" : "en-GB")}</small></div>)}</div></div>
      </div>}</section>
    </div>
  </main>;
}
