"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { addDays, formatDate } from "@/lib/legalTools";
import { parseDateInput } from "./parseDate";

const PRESET_DAYS = [3, 7, 8, 10, 15, 30, 45, 60, 180];

// Statutory appeal / objection / cassation deadlines under Bahraini
// procedure. Click a row to load that period into the calculator.
const STATUTORY_DEADLINES: { days: number; en: string; ar: string }[] = [
  { days: 15, en: "Appeal of Criminal Judgments", ar: "استئناف الأحكام الجنائية" },
  { days: 7, en: "Objection to a Criminal Order", ar: "الاعتراض على الأمر الجنائي" },
  {
    days: 10,
    en: 'Grievance against an Order of "No Prima Facie Case"',
    ar: "التظلم في الأمر بألا وجه لإقامة الدعوى الجنائية",
  },
  { days: 45, en: "Appeal of Civil and Commercial Judgments", ar: "استئناف الأحكام المدنية والتجارية" },
  { days: 10, en: "Appeal of Civil Summary Urgent Matters", ar: "استئناف الأحكام المستعجلة المدنية" },
  { days: 30, en: "Appeal of Sharia Matters", ar: "استئناف الأحكام الشرعية" },
  {
    days: 45,
    en: "Cassation in Civil, Commercial, Sharia, and Non-Muslim Personal Status Matters",
    ar: "الطعن بالتمييز في المواد المدنية والتجارية والشرعية والأحوال الشخصية لغير المسلمين",
  },
  { days: 30, en: "Cassation in Criminal Judgments", ar: "الطعن بالتمييز في الأحكام الجنائية" },
];

export default function DeadlineCalc() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [startDate, setStartDate] = useState<string>("");
  const [periodKey, setPeriodKey] = useState<string>("30");
  const [customDays, setCustomDays] = useState<string>("");

  const parsedStart = parseDateInput(startDate);
  const days =
    periodKey === "other" ? parseInt(customDays, 10) : parseInt(periodKey, 10);
  const end = parsedStart && Number.isFinite(days) ? addDays(parsedStart, days) : null;

  return (
    <div className="space-y-4">
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
          {isAr ? "المدة القانونية" : "Legal Period"}
        </label>
        <select
          value={periodKey}
          onChange={(e) => setPeriodKey(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-primary"
        >
          {PRESET_DAYS.map((d) => (
            <option key={d} value={d}>
              {d} {isAr ? "يوم" : "days"}
            </option>
          ))}
          <option value="other">{isAr ? "مدة أخرى" : "Other period"}</option>
        </select>
      </div>
      {periodKey === "other" && (
        <div>
          <label className="block text-sm font-bold text-text-primary mb-1.5">
            {isAr ? "عدد الأيام" : "Number of Days"}
          </label>
          <input
            type="number"
            min="1"
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
          />
        </div>
      )}
      {end && (
        <div className="rounded-xl bg-primary/[0.04] border border-primary/20 p-4">
          <div className="text-xs text-text-muted mb-1">
            {isAr ? "تاريخ الانتهاء" : "End Date"}
          </div>
          <div className="text-lg font-extrabold text-primary">
            {formatDate(end, isAr ? "ar" : "en")}
          </div>
        </div>
      )}

      {/* Statutory deadlines reference */}
      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-sm font-bold text-text-primary mb-1">
          {isAr ? "مرجع المواعيد القانونية" : "Statutory Deadlines Reference"}
        </h3>
        <p className="text-[12px] text-text-muted mb-3">
          {isAr
            ? "اضغط على أي بند لتعبئة المدة في الحاسبة أعلاه."
            : "Tap any row to load that period into the calculator above."}
        </p>
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-bg-light text-[11px] uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-2.5 text-start font-bold w-24">
                  {isAr ? "المدة القانونية" : "Legal Deadline"}
                </th>
                <th className="px-3 py-2.5 text-start font-bold">
                  {isAr ? "نوع القضية / القرار" : "Case / Decision Type"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {STATUTORY_DEADLINES.map((row, i) => {
                const active = periodKey === String(row.days);
                return (
                  <tr
                    key={`${row.days}-${i}`}
                    onClick={() => setPeriodKey(String(row.days))}
                    className={`cursor-pointer transition-colors ${
                      active ? "bg-primary/[0.06]" : "hover:bg-bg-light/70"
                    }`}
                  >
                    <td className="px-3 py-2.5 align-top whitespace-nowrap font-extrabold text-primary">
                      {row.days} {isAr ? "يوم" : "days"}
                    </td>
                    <td className="px-3 py-2.5 align-top text-text-secondary leading-snug">
                      {isAr ? row.ar : row.en}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-text-muted leading-relaxed">
          {isAr
            ? "ملاحظة: المواعيد إرشادية وفق الممارسة المتعارف عليها وقد تختلف بحسب القانون والإجراء. تحقق دائماً من المدة النظامية المطبقة على حالتك."
            : "Note: Periods are indicative of common practice and may vary by law and procedure. Always verify the statutory deadline that applies to your case."}
        </p>
      </div>
    </div>
  );
}
