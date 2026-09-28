"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { daysBetween, durationBreakdown } from "@/lib/legalTools";
import { parseDateInput } from "./parseDate";

export default function DurationCalc() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  const days = start && end ? daysBetween(start, end) : null;
  const breakdown =
    start && end && days !== null && days >= 0 ? durationBreakdown(start, end) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-text-primary mb-1.5">
            {isAr ? "تاريخ البداية" : "Start Date"}
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-text-primary mb-1.5">
            {isAr ? "تاريخ النهاية" : "End Date"}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      {breakdown && days !== null && (
        <div className="rounded-xl bg-primary/[0.04] border border-primary/20 p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-text-muted">
              {isAr ? "إجمالي الأيام" : "Total Days"}
            </span>
            <span className="text-lg font-extrabold text-primary">{days}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">{isAr ? "التفصيل" : "Breakdown"}</span>
            <span className="font-semibold text-text-primary">
              {breakdown.years} {isAr ? "سنة" : "years"} · {breakdown.months}{" "}
              {isAr ? "شهر" : "months"} · {breakdown.days}{" "}
              {isAr ? "يوم" : "days"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
