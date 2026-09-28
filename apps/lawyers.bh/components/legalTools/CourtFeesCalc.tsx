"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { calculateCourtFees, formatBD } from "@/lib/legalTools";

export default function CourtFeesCalc() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [amount, setAmount] = useState<string>("");
  const parsed = parseFloat(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const fee = valid ? calculateCourtFees(parsed) : null;
  return (
    <div>
      <label className="block text-sm font-bold text-text-primary mb-1.5">
        {isAr ? "قيمة المطالبة (د.ب)" : "Claim Amount (BD)"}
      </label>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={isAr ? "أدخل القيمة" : "Enter amount"}
        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
      />
      {fee !== null && (
        <div className="mt-5 rounded-xl bg-primary/[0.04] border border-primary/20 p-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-text-secondary">
            {isAr ? "رسوم المحكمة" : "Court Fees"}
          </span>
          <span className="text-xl font-extrabold text-primary">
            {formatBD(fee)} {isAr ? "د.ب" : "BD"}
          </span>
        </div>
      )}
      <p className="mt-3 text-xs text-text-muted">
        {isAr
          ? "ملاحظة: القيمة إرشادية وفقاً للممارسة الحالية. تخضع الرسوم الفعلية لتقدير المحكمة ووزارة العدل."
          : "Note: Figures are indicative. Actual fees are determined by the court and the Ministry of Justice."}
      </p>
    </div>
  );
}
