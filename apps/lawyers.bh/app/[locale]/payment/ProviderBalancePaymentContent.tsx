"use client";

import { CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import TapApplePayPayment from "../book-appointment/_components/book-appointment/TapApplePayPayment";
import TapCardPayment from "../book-appointment/_components/book-appointment/TapCardPayment";
import type { PublicProviderBalance } from "@/lib/payments/provider-balance-public";
import { balanceCanPay, providerBalanceCopy } from "./providerBalance";

type PaymentMethod = "card" | "benefitpay" | "applepay";
type TapCurrency = "BHD" | "SAR" | "AED" | "KWD" | "QAR" | "OMR" | "USD" | "EUR" | "GBP";
const errors: Record<string, { ar: string; en: string }> = {
  BALANCE_NOT_FOUND: { ar: "لم يتم العثور على مطالبة الدفع.", en: "Payment request not found." },
  BALANCE_NOT_PAYABLE: { ar: "هذه المطالبة غير متاحة للدفع.", en: "This payment request is not payable." },
  PAYMENT_ALREADY_PROCESSING: { ar: "عملية الدفع قيد المعالجة. انتظر قليلًا ثم حدّث الصفحة.", en: "Payment is being processed. Wait briefly, then refresh the page." },
  CUSTOMER_CONTACT_REQUIRED: { ar: "بيانات تواصل العميل غير مكتملة. يرجى التواصل مع مقدم الخدمة.", en: "Customer contact details are incomplete. Contact the service provider." },
  TAP_PAYMENT_UNAVAILABLE: { ar: "تعذر بدء الدفع الآن. يرجى المحاولة مرة أخرى.", en: "Payment could not be started. Please try again." },
};

export default function ProviderBalancePaymentContent({ reference }: { reference: string }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [balance, setBalance] = useState<PublicProviderBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBalance = useCallback(async () => {
    const response = await fetch(`/api/public/provider-balances/${encodeURIComponent(reference)}?locale=${locale}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.code ?? "BALANCE_NOT_FOUND");
    setBalance(data.balance as PublicProviderBalance);
  }, [locale, reference]);

  useEffect(() => {
    let active = true;
    loadBalance().catch((cause) => active && setError(cause instanceof Error ? cause.message : "BALANCE_NOT_FOUND")).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [loadBalance]);

  useEffect(() => {
    if (balance?.status !== "pending_payment" || typeof window === "undefined" || !new URLSearchParams(window.location.search).has("tap_id")) return;
    const timer = window.setInterval(() => { loadBalance().catch(() => undefined); }, 2500);
    const stop = window.setTimeout(() => window.clearInterval(timer), 30000);
    return () => { window.clearInterval(timer); window.clearTimeout(stop); };
  }, [balance?.status, loadBalance]);

  const startPayment = useCallback(async (sourceId: string) => {
    if (!balance || submitting) return;
    setSubmitting(true); setError(null);
    try {
      const response = await fetch(`/api/public/provider-balances/${encodeURIComponent(reference)}/pay?locale=${locale}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !data.transactionUrl) throw new Error(data.code ?? "TAP_PAYMENT_UNAVAILABLE");
      window.location.href = data.transactionUrl;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "TAP_PAYMENT_UNAVAILABLE");
      setSubmitting(false);
    }
  }, [balance, locale, reference, submitting]);

  const copy = useMemo(() => balance ? providerBalanceCopy(balance.status, isAr) : null, [balance, isAr]);
  const displayedError = error ? (errors[error]?.[isAr ? "ar" : "en"] ?? (isAr ? "حدث خطأ غير متوقع." : "An unexpected error occurred.")) : null;
  if (loading) return <div className="min-h-[calc(100vh-200px)] bg-bg-light px-6 py-12"><div className="mx-auto flex max-w-xl items-center justify-center rounded-3xl bg-white p-8 text-text-muted shadow-sm"><Loader2 className="me-2 animate-spin" size={18} />{isAr ? "جاري تحميل بيانات الدفع..." : "Loading payment details..."}</div></div>;
  if (!balance || !copy) return <div className="min-h-[calc(100vh-200px)] bg-bg-light px-6 py-12"><div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-extrabold">{isAr ? "تعذر فتح مطالبة الدفع" : "Could not open payment request"}</h1><p className="mt-3 text-sm text-red-700">{displayedError}</p></div></div>;

  const amount = Number(balance.amount);
  const currencyCode = balance.currencyCode as TapCurrency;
  const amountLabel = `${amount.toFixed(3)} ${balance.currencyCode}`;
  const canPay = balanceCanPay(balance.status);
  return <main dir={isAr ? "rtl" : "ltr"} className="min-h-[calc(100vh-200px)] bg-bg-light px-4 py-8 sm:px-6 lg:py-14"><section className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-sm">
    <header className="border-b border-slate-100 bg-gradient-to-br from-primary/[0.08] via-white to-white p-6 sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-primary shadow-sm"><ShieldCheck size={14} />{isAr ? "دفع آمن عبر محامون" : "Secure Lawyers.bh payment"}</div><h1 className="text-2xl font-black text-text-primary sm:text-3xl">{copy.title}</h1><p className="mt-2 text-sm leading-7 text-text-secondary">{copy.description}</p></div><div className="rounded-2xl bg-white px-5 py-4 shadow-sm sm:text-end"><div className="text-xs font-bold text-text-muted">{isAr ? "المبلغ" : "Amount"}</div><div dir="ltr" className="mt-1 text-2xl font-black text-primary">{amountLabel}</div></div></div></header>
    <div className="p-5 sm:p-8"><dl className="grid gap-4 rounded-3xl border border-slate-100 bg-slate-50/70 p-5 sm:grid-cols-2">{[[isAr ? "رقم المطالبة" : "Reference", balance.reference], [isAr ? "مقدم الخدمة" : "Service provider", balance.providerName], [isAr ? "العميل" : "Customer", balance.customerName], [isAr ? "تاريخ الاستحقاق" : "Due date", balance.dueDate ?? (isAr ? "غير محدد" : "Not specified")]].map(([label, value]) => <div key={label}><dt className="text-xs font-bold text-text-muted">{label}</dt><dd className="mt-1 font-extrabold text-text-primary">{value}</dd></div>)}<div className="sm:col-span-2"><dt className="text-xs font-bold text-text-muted">{isAr ? "وصف الخدمة" : "Description"}</dt><dd className="mt-1 leading-7 text-text-primary">{balance.description}</dd></div></dl>
      {canPay ? <><div className="mt-6 grid gap-3 sm:grid-cols-3">{(["card", "benefitpay", "applepay"] as const).map((value) => <button key={value} type="button" disabled={submitting} onClick={() => { setMethod(value); setError(null); }} className={`rounded-2xl border p-4 text-center font-extrabold transition ${method === value ? "border-primary bg-primary/[0.06] text-primary ring-4 ring-primary/10" : "border-slate-200"}`}>{value === "card" ? (isAr ? "بطاقة بنكية" : "Card") : value === "benefitpay" ? "BenefitPay" : "Apple Pay"}</button>)}</div>
        {method === "card" ? <div className="mt-5"><TapCardPayment isAr={isAr} amount={amount} currencyCode={currencyCode} currentPriceLabel={amountLabel} name={balance.customerName} email="customer@example.com" phone="00000000" disabled={submitting} submitting={submitting} onTokenGenerated={startPayment} /></div> : null}
        {method === "applepay" ? <div className="mt-5"><TapApplePayPayment isAr={isAr} amount={amount} currencyCode={currencyCode} currentPriceLabel={amountLabel} name={balance.customerName} email="customer@example.com" phone="00000000" disabled={submitting} submitting={submitting} onTokenGenerated={startPayment} /></div> : null}
        {method === "benefitpay" ? <button type="button" disabled={submitting} onClick={() => startPayment("src_bh.benefit")} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 font-bold text-white disabled:opacity-50">{submitting ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={18} />}{isAr ? `الدفع الآن - ${amountLabel}` : `Pay now - ${amountLabel}`}</button> : null}</> : <div className={`mt-6 rounded-2xl border px-5 py-4 text-sm font-bold ${balance.status === "paid" ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{balance.status === "paid" ? <CheckCircle2 className="me-2 inline" size={18} /> : null}{copy.description}</div>}
      {displayedError ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{displayedError}</div> : null}</div>
  </section></main>;
}
