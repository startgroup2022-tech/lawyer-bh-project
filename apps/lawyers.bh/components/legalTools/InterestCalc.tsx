"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";
import { calculateLegalInterest, formatBD } from "@/lib/legalTools";
import { parseDateInput } from "./parseDate";

type InterestRow = { amountPaid: string; from: string; to: string };

export default function InterestCalc() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [judgment, setJudgment] = useState<string>("");
  const [rate, setRate] = useState<string>("5");
  const [rows, setRows] = useState<InterestRow[]>([
    { amountPaid: "0", from: "", to: "" },
  ]);

  const parsedJudgment = parseFloat(judgment);
  const parsedRate = parseFloat(rate);
  const parsedRows = rows
    .map((r) => ({
      amountPaid: parseFloat(r.amountPaid || "0"),
      from: parseDateInput(r.from),
      to: parseDateInput(r.to),
    }))
    .filter(
      (r): r is { amountPaid: number; from: Date; to: Date } =>
        !!(r.from && r.to && r.to >= r.from),
    );

  const valid =
    Number.isFinite(parsedJudgment) &&
    parsedJudgment > 0 &&
    Number.isFinite(parsedRate) &&
    parsedRate >= 0 &&
    parsedRows.length > 0;

  const result = valid
    ? calculateLegalInterest(parsedJudgment, parsedRate, parsedRows)
    : null;

  const updateRow = (i: number, patch: Partial<InterestRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addRow = () =>
    setRows((prev) => [...prev, { amountPaid: "0", from: "", to: "" }]);
  const removeRow = (i: number) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-text-primary mb-1.5">
            {isAr ? "قيمة الحكم (د.ب)" : "Judgment Amount (BD)"}
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={judgment}
            onChange={(e) => setJudgment(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-text-primary mb-1.5">
            {isAr ? "نسبة الفائدة (%)" : "Interest Rate (%)"}
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-bg-light p-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">
                  {isAr ? "المبلغ المدفوع" : "Amount Paid"}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={row.amountPaid}
                  onChange={(e) => updateRow(i, { amountPaid: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">
                  {isAr ? "من" : "From"}
                </label>
                <input
                  type="date"
                  value={row.from}
                  onChange={(e) => updateRow(i, { from: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">
                  {isAr ? "إلى" : "To"}
                </label>
                <input
                  type="date"
                  value={row.to}
                  onChange={(e) => updateRow(i, { to: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                />
              </div>
              <div>
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(i)}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                    {isAr ? "حذف" : "Remove"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={addRow}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors"
        >
          <Plus size={14} />
          {isAr ? "إضافة فترة" : "Add Period"}
        </button>
      </div>

      {result && result.rows.length > 0 && (
        <div className="rounded-xl border border-primary/20 overflow-hidden">
          <div className="bg-primary/[0.04] p-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-text-secondary">
              {isAr ? "إجمالي الفائدة" : "Total Interest"}
            </span>
            <span className="text-xl font-extrabold text-primary">
              {formatBD(result.total)} {isAr ? "د.ب" : "BD"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-light text-xs">
                <tr>
                  <th className="px-3 py-2 text-start text-text-muted font-semibold">#</th>
                  <th className="px-3 py-2 text-start text-text-muted font-semibold">
                    {isAr ? "المبلغ" : "Paid"}
                  </th>
                  <th className="px-3 py-2 text-start text-text-muted font-semibold">
                    {isAr ? "الأيام" : "Days"}
                  </th>
                  <th className="px-3 py-2 text-start text-text-muted font-semibold">
                    {isAr ? "الرصيد المتبقي" : "Residual"}
                  </th>
                  <th className="px-3 py-2 text-end text-text-muted font-semibold">
                    {isAr ? "الفائدة" : "Interest"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.rows.map((r) => (
                  <tr key={r.index}>
                    <td className="px-3 py-2 text-text-muted">{r.index}</td>
                    <td className="px-3 py-2 text-text-primary">{formatBD(r.amountPaid)}</td>
                    <td className="px-3 py-2 text-text-primary">{r.days}</td>
                    <td className="px-3 py-2 text-text-primary">{formatBD(r.residualBalance)}</td>
                    <td className="px-3 py-2 text-end font-semibold text-primary">
                      {formatBD(r.interest)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-xs text-text-muted border-t border-gray-100">
            {isAr
              ? "حساب بسيط على الرصيد المتبقي بنسبة الفائدة على أساس سنة 360 يوماً."
              : "Simple interest on residual balance at the given rate, using a 360-day year."}
          </p>
        </div>
      )}
    </div>
  );
}
