"use client";

import { useState } from "react";
import { Loader2, Tag, X } from "lucide-react";
import type { SharedPaymentDraft } from "./paymentDraft";

export type AppliedDiscount = { code: string; originalAmountBd: string; discountAmountBd: string; finalAmountBd: string };

const messages: Record<string, { ar: string; en: string }> = {
  wrong_channel: { ar: "هذا الكود مخصص للتطبيق فقط.", en: "This code is available in the app only." },
  invalid: { ar: "كود الخصم غير صالح.", en: "The discount code is invalid." }, inactive: { ar: "كود الخصم غير مفعّل.", en: "The discount code is inactive." },
  not_started: { ar: "لم تبدأ صلاحية الكود بعد.", en: "This code is not active yet." }, expired: { ar: "انتهت صلاحية الكود.", en: "This code has expired." },
  total_limit: { ar: "تم بلوغ حد استخدام الكود.", en: "This code has reached its usage limit." }, user_limit: { ar: "استخدمت هذا الكود الحد المسموح.", en: "You have reached your limit for this code." },
  zero_total: { ar: "لا يمكن استخدام الكود لأن الإجمالي يصبح صفرًا.", en: "This code cannot be used because the total becomes zero." },
};

export default function DiscountCodeField({ draft, isAr, applied, onApplied, onRemoved }: { draft: SharedPaymentDraft; isAr: boolean; applied: AppliedDiscount | null; onApplied(value: AppliedDiscount): void; onRemoved(): void }) {
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function apply() {
    setBusy(true); setError("");
    const response = await fetch("/api/discounts/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft.payload, paymentFlow: draft.flow, caseType: draft.flow === "sos" ? draft.caseType : undefined, consultationMethod: draft.flow === "book_appointment" ? draft.consultationMethod : undefined, email: draft.email, discountCode: code }) });
    const data = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok || !data.quote) { const copy = messages[data.errorCode] ?? messages.invalid; setError(isAr ? copy.ar : copy.en); return; }
    onApplied(data.quote); setCode(data.quote.code);
  }
  if (applied) return <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 font-black text-emerald-800"><Tag className="h-4 w-4" />{applied.code}</span><button type="button" onClick={() => { onRemoved(); setCode(""); }} className="rounded-full p-1 text-emerald-800"><X className="h-4 w-4" /></button></div><div className="mt-3 grid grid-cols-3 gap-2 text-sm"><span>{isAr ? "السعر" : "Price"}<b className="block">{applied.originalAmountBd} BHD</b></span><span>{isAr ? "الخصم" : "Discount"}<b className="block text-emerald-700">-{applied.discountAmountBd} BHD</b></span><span>{isAr ? "الإجمالي" : "Total"}<b className="block">{applied.finalAmountBd} BHD</b></span></div></div>;
  return <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"><label className="mb-2 block text-sm font-black">{isAr ? "هل لديك كود خصم؟" : "Have a discount code?"}</label><div className="flex gap-2"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={32} className="min-w-0 flex-1 rounded-xl border bg-white px-4 py-3 font-bold uppercase" placeholder={isAr ? "أدخل الكود" : "Enter code"} /><button type="button" disabled={busy || code.trim().length < 2} onClick={apply} className="rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? "تطبيق" : "Apply")}</button></div>{error && <p className="mt-2 text-sm font-bold text-red-700">{error}</p>}</div>;
}
