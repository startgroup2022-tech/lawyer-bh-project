"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Siren,
  ChevronLeft,
  Wallet,
  CheckCircle2,
  RotateCcw,
  Loader2,
  Download,
  Mail,
  Phone,
  RefreshCw,
} from "lucide-react";

interface Advocate {
  advocateId: string;
  fullName: string;
  registrationNo: string;
  email: string | null;
  phone: string;
  isActive: boolean;
  paidCompletedCount: number;
  settledCount: number;
  outstandingCount: number;
  grossPaidBhd: number;
  outstandingGrossBhd: number;
  advocateCutBhd: number;
  outstandingAdvocateCutBhd: number;
  platformCutBhd: number;
}

interface Totals {
  grossPaid: number;
  outstandingGross: number;
  advocateCut: number;
  platformCut: number;
  outstandingAdvocateCut: number;
  outstandingCount: number;
  paidCompletedCount: number;
}

export default function PayoutsView({
  advocates,
  totals,
  cutPercent,
}: {
  advocates: Advocate[];
  totals: Totals;
  cutPercent: number;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function settleAll(advocateId: string) {
    setBusyId(advocateId);
    try {
      const res = await fetch(
        `/api/sos/dispatch/payouts/${encodeURIComponent(advocateId)}/settle`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(`Settle failed: ${data.error ?? res.status}`);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  async function unsettleAll(advocateId: string) {
    if (!confirm("Mark this advocate's settled cases as outstanding again?"))
      return;
    setBusyId(advocateId);
    try {
      const res = await fetch(
        `/api/sos/dispatch/payouts/${encodeURIComponent(advocateId)}/unsettle`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(`Unsettle failed: ${data.error ?? res.status}`);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light pb-12">
      <div className="bg-gradient-to-r from-[#1A237E] via-[#0D1660] to-[#1A237E] text-white">
        <div className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="../dispatch"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25"
              title="Back to cases"
            >
              <ChevronLeft size={18} />
            </a>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D32F2F]">
              <Siren size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                Saudi Lawyers · Dispatch
              </div>
              <h1 className="text-lg font-extrabold leading-tight truncate">
                Payouts
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/sos/dispatch/payouts/export"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-semibold hover:bg-white/25"
            >
              <Download size={13} />
              CSV
            </a>
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Settle every paid+completed case older than 14 days?")) return;
                const res = await fetch(
                  "/api/sos/dispatch/payouts/auto-settle?olderThanDays=14",
                  { method: "POST" },
                );
                const data = (await res.json().catch(() => ({}))) as {
                  settledCount?: number;
                  error?: string;
                };
                if (!res.ok) {
                  alert(`Auto-settle failed: ${data.error ?? res.status}`);
                  return;
                }
                alert(`Settled ${data.settledCount ?? 0} case(s).`);
                router.refresh();
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-3 py-1.5 text-[12px] font-semibold ring-1 ring-emerald-300 hover:bg-emerald-500/30"
            >
              <CheckCircle2 size={13} />
              Auto-settle 14d+
            </button>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-semibold hover:bg-white/25"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-5 space-y-5">
        {/* Platform totals */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat
            label="Gross paid (lifetime)"
            value={`${totals.grossPaid.toFixed(2)} SAR`}
            sub={`${totals.paidCompletedCount} cases`}
          />
          <Stat
            label="Advocate cut total"
            value={`${totals.advocateCut.toFixed(2)} SAR`}
            sub={`${cutPercent}% of gross`}
          />
          <Stat
            label="Platform cut total"
            value={`${totals.platformCut.toFixed(2)} SAR`}
            sub={`${100 - cutPercent}% of gross`}
          />
          <Stat
            label="Outstanding to advocates"
            value={`${totals.outstandingAdvocateCut.toFixed(2)} SAR`}
            sub={`${totals.outstandingCount} cases unsettled`}
            highlight
          />
        </section>

        {advocates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-text-muted">
            No advocates onboarded yet.
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm">
            <table className="w-full text-[12px]">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="text-start px-4 py-2.5">Advocate</th>
                  <th className="text-end px-2 py-2.5">Cases</th>
                  <th className="text-end px-2 py-2.5">Outstanding</th>
                  <th className="text-end px-2 py-2.5">Gross SAR</th>
                  <th className="text-end px-2 py-2.5">
                    Advocate cut ({cutPercent}%)
                  </th>
                  <th className="text-end px-2 py-2.5">Owed now</th>
                  <th className="text-end px-4 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {advocates.map((a) => (
                  <tr
                    key={a.advocateId}
                    className="border-t border-gray-100 align-middle"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-text-primary">
                        {a.fullName}
                        {!a.isActive && (
                          <span className="ms-2 inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-[9px] font-bold uppercase text-gray-700">
                            inactive
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-text-muted">
                        #{a.registrationNo}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
                        {a.email && (
                          <a
                            href={`mailto:${a.email}`}
                            className="inline-flex items-center gap-1"
                          >
                            <Mail size={10} />
                            {a.email}
                          </a>
                        )}
                        <a
                          href={`tel:${a.phone}`}
                          className="inline-flex items-center gap-1"
                          dir="ltr"
                        >
                          <Phone size={10} />
                          {a.phone}
                        </a>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-end">
                      <div className="font-semibold">{a.paidCompletedCount}</div>
                      <div className="text-[10px] text-text-muted">
                        {a.settledCount} settled
                      </div>
                    </td>
                    <td className="px-2 py-3 text-end font-semibold text-amber-700">
                      {a.outstandingCount}
                    </td>
                    <td className="px-2 py-3 text-end font-mono">
                      {a.grossPaidBhd.toFixed(2)}
                    </td>
                    <td className="px-2 py-3 text-end font-mono text-emerald-700">
                      {a.advocateCutBhd.toFixed(2)}
                    </td>
                    <td className="px-2 py-3 text-end font-mono font-bold text-[#D32F2F]">
                      {a.outstandingAdvocateCutBhd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        {a.outstandingCount > 0 && (
                          <button
                            type="button"
                            onClick={() => settleAll(a.advocateId)}
                            disabled={busyId === a.advocateId}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-60"
                          >
                            {busyId === a.advocateId ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={10} />
                            )}
                            Settle
                          </button>
                        )}
                        {a.settledCount > 0 && (
                          <button
                            type="button"
                            onClick={() => unsettleAll(a.advocateId)}
                            disabled={busyId === a.advocateId}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-[10px] font-semibold text-text-muted"
                            title="Mark settled cases as outstanding again"
                          >
                            <RotateCcw size={10} />
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? "border-amber-200 bg-amber-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
        <Wallet size={11} className={highlight ? "text-amber-600" : ""} />
        {label}
      </div>
      <div className="mt-1 text-xl font-extrabold text-text-primary">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-text-muted">{sub}</div>}
    </div>
  );
}
