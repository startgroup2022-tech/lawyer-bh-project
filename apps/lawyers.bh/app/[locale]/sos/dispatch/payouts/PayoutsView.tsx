"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, Loader2, RefreshCw, Siren, Wallet } from "lucide-react";

import { formatBhd, settlementStatusLabel } from "./presentation";

type Payable = {
  id: string;
  providerId: string | null;
  providerName: string;
  iban: string | null;
  requestType: "booking" | "emergency";
  requestId: string;
  grossAmount: number;
  platformPercentage: number;
  providerPercentage: number;
  platformAmount: number;
  providerAmount: number;
  capturedAt: string;
  settlementStatus: string;
  settlementMethod: string | null;
  settlementReference: string | null;
  settlementTransferredAt: string | null;
};

export default function PayoutsView({ locale, payables, totals }: {
  locale: string;
  payables: Payable[];
  totals: { gross: number; platform: number; provider: number; pending: number };
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function settle(item: Payable) {
    if (!item.iban) return;
    const reference = window.prompt(isAr ? "مرجع التحويل البنكي" : "Bank transfer reference")?.trim();
    if (!reference) return;
    const transferredAt = window.prompt(isAr ? "تاريخ التحويل (YYYY-MM-DD)" : "Transfer date (YYYY-MM-DD)", new Date().toISOString().slice(0, 10))?.trim();
    if (!transferredAt) return;

    setBusyId(item.id);
    try {
      const response = await fetch(`/api/admin/provider-payables/${item.id}/settle`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: "bank", reference, transferredAt }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) window.alert(data.error || (isAr ? "تعذر تسجيل التحويل" : "Settlement failed"));
      else startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light pb-12">
      <div className="bg-gradient-to-r from-[#1A237E] via-[#0D1660] to-[#1A237E] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-3">
            <a href="../dispatch" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15"><ChevronLeft size={18} /></a>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D32F2F]"><Siren size={18} /></span>
            <h1 className="text-lg font-extrabold">{isAr ? "مستحقات المحامين" : "Lawyer Payables"}</h1>
          </div>
          <button type="button" onClick={() => router.refresh()} className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-xs"><RefreshCw size={13} />{isAr ? "تحديث" : "Refresh"}</button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-5 py-5">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={isAr ? "الإجمالي المحصل" : "Gross captured"} value={formatBhd(totals.gross)} />
          <Stat label={isAr ? "حصة المنصة" : "Platform share"} value={formatBhd(totals.platform)} />
          <Stat label={isAr ? "حصة المحامين" : "Lawyer share"} value={formatBhd(totals.provider)} />
          <Stat label={isAr ? "مطلوب تحويله" : "Pending transfer"} value={formatBhd(totals.pending)} highlight />
        </section>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[1100px] text-xs">
            <thead className="bg-gray-50 text-text-muted"><tr>
              <th className="px-3 py-3 text-start">{isAr ? "المحامي" : "Lawyer"}</th>
              <th className="px-3 py-3 text-start">IBAN</th>
              <th className="px-3 py-3 text-start">{isAr ? "الطلب" : "Request"}</th>
              <th className="px-3 py-3 text-end">{isAr ? "الإجمالي" : "Gross"}</th>
              <th className="px-3 py-3 text-end">{isAr ? "المنصة" : "Platform"}</th>
              <th className="px-3 py-3 text-end">{isAr ? "المحامي" : "Lawyer"}</th>
              <th className="px-3 py-3 text-start">{isAr ? "الحالة" : "Status"}</th>
              <th className="px-3 py-3 text-end">{isAr ? "الإجراء" : "Action"}</th>
            </tr></thead>
            <tbody>{payables.map((item) => {
              const canSettle = ["bank_pending", "failed"].includes(item.settlementStatus) && Boolean(item.iban);
              return <tr key={item.id} className="border-t border-gray-100">
                <td className="px-3 py-3 font-bold">{item.providerName}</td>
                <td className="px-3 py-3 font-mono" dir="ltr">{item.iban || (isAr ? "غير متوفر" : "Missing")}</td>
                <td className="px-3 py-3"><div>{item.requestType === "emergency" ? (isAr ? "طوارئ" : "Emergency") : (isAr ? "حجز" : "Booking")}</div><div className="font-mono text-[10px] text-text-muted">{item.requestId}</div></td>
                <td className="px-3 py-3 text-end font-mono">{formatBhd(item.grossAmount)}</td>
                <td className="px-3 py-3 text-end font-mono">{formatBhd(item.platformAmount)} ({item.platformPercentage}%)</td>
                <td className="px-3 py-3 text-end font-mono font-bold">{formatBhd(item.providerAmount)} ({item.providerPercentage}%)</td>
                <td className="px-3 py-3"><span className="rounded-full bg-gray-100 px-2 py-1 font-bold">{settlementStatusLabel(item.settlementStatus, locale)}</span>{item.settlementReference && <div className="mt-1 font-mono text-[10px]">{item.settlementReference}</div>}</td>
                <td className="px-3 py-3 text-end"><button type="button" disabled={!canSettle || busyId === item.id} onClick={() => settle(item)} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 font-bold text-white disabled:bg-gray-300">{busyId === item.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}{isAr ? "تسجيل التحويل" : "Record transfer"}</button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`rounded-xl border p-3 ${highlight ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}><div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-text-muted"><Wallet size={11} />{label}</div><div className="mt-1 text-xl font-extrabold">{value}</div></div>;
}
