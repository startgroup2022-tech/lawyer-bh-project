"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Plus, Trash2, Loader2, Calendar } from "lucide-react";

interface Shift {
  id: string;
  dayOfWeek: number;
  startMinuteUtc: number;
  endMinuteUtc: number;
  notes?: string | null;
  isActive?: boolean;
}

const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** Lawyer-side widget for declaring recurring on-call windows. The
 *  advocate enters times in their local timezone; we translate to
 *  minute-of-UTC-day before posting so the geo-matcher's time check
 *  has a consistent reference frame. */
export default function SosShiftPanel() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const dayLabels = isAr ? DAY_LABELS_AR : DAY_LABELS_EN;

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [day, setDay] = useState(1); // Monday default
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("23:00");
  const [error, setError] = useState<string | null>(null);

  const tzOffsetMin = new Date().getTimezoneOffset(); // minutes WEST of UTC

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/sos/lawyer/shifts", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { shifts: Shift[] };
        setShifts(data.shifts);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  function localToUtcMinute(hhmm: string): number {
    const [h, m] = hhmm.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
    let v = h * 60 + m + tzOffsetMin;
    v = ((v % 1440) + 1440) % 1440;
    return v;
  }

  function utcMinuteToLocal(min: number): string {
    let v = min - tzOffsetMin;
    v = ((v % 1440) + 1440) % 1440;
    const h = Math.floor(v / 60);
    const m = v % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  async function add() {
    const startUtc = localToUtcMinute(start);
    const endUtc = localToUtcMinute(end);
    if (startUtc < 0 || endUtc < 0 || startUtc === endUtc) {
      setError(isAr ? "يرجى إدخال أوقات صحيحة." : "Please enter valid times.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/sos/lawyer/shifts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: day,
          startMinuteUtc: startUtc,
          endMinuteUtc: endUtc,
        }),
      });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setShifts((s) => s.filter((x) => x.id !== id));
    await fetch(`/api/sos/lawyer/shifts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    void reload();
  }

  // Detect overlapping windows on the same day so the advocate gets a
  // friendly warning before the dispatcher sees double-counting. Two
  // shifts on day D overlap when their UTC minute intervals overlap;
  // overnight wraps are handled by reasoning per-half (pre/post-midnight)
  // because the matcher does the same.
  function expandShiftToDayIntervals(s: Shift): Array<{ day: number; from: number; to: number }> {
    if (s.endMinuteUtc > s.startMinuteUtc) {
      return [{ day: s.dayOfWeek, from: s.startMinuteUtc, to: s.endMinuteUtc }];
    }
    return [
      { day: s.dayOfWeek, from: s.startMinuteUtc, to: 1440 },
      { day: (s.dayOfWeek + 1) % 7, from: 0, to: s.endMinuteUtc },
    ];
  }
  const conflicts: Array<{ a: string; b: string }> = [];
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      const A = expandShiftToDayIntervals(shifts[i]);
      const B = expandShiftToDayIntervals(shifts[j]);
      const clash = A.some((a) =>
        B.some(
          (b) => a.day === b.day && a.from < b.to && b.from < a.to,
        ),
      );
      if (clash) conflicts.push({ a: shifts[i].id, b: shifts[j].id });
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
      <div className="mb-3 flex items-center gap-2">
        <Calendar size={14} className="text-[#1A237E]" />
        <h2 className="text-[14px] font-extrabold text-text-primary">
          {isAr ? "ساعات الدوام الأسبوعية" : "Weekly on-call schedule"}
        </h2>
      </div>
      <p className="text-[11px] text-text-muted leading-snug">
        {isAr
          ? "أضف نوافذ زمنية تكون فيها متاحاً تلقائياً لاستقبال طلبات الطوارئ. الأوقات بتوقيتك المحلي."
          : "Declare recurring windows when you're automatically available for emergency dispatch. Times are in your local timezone."}
      </p>

      {/* Add form */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          {dayLabels.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          dir="ltr"
        />
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          dir="ltr"
        />
        <button
          type="button"
          onClick={add}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1A237E] px-3 py-2 text-[12px] font-extrabold text-white disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Plus size={12} />
          )}
          {isAr ? "إضافة" : "Add"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[11px] text-[#D32F2F]">{error}</p>
      )}

      {conflicts.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900">
          {isAr
            ? `تنبيه: ${conflicts.length} تداخل بين النوافذ. لا يؤثر على الاستجابة، لكن قد يكون عدّاً مزدوجاً.`
            : `Heads up — ${conflicts.length} overlapping window${conflicts.length > 1 ? "s" : ""} detected. Dispatch still works but the schedule double-counts you.`}
        </div>
      )}

      {/* List */}
      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-[12px] text-text-muted">
            <Loader2 size={12} className="animate-spin" />
            {isAr ? "جاري التحميل…" : "Loading…"}
          </div>
        ) : shifts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-[12px] text-text-muted">
            {isAr
              ? "لا توجد ساعات دوام حالياً. أضف نافذة زمنية واحدة على الأقل."
              : "No shifts yet. Add at least one window above."}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {shifts.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[12px]"
              >
                <div className="min-w-0">
                  <span className="font-bold text-text-primary">
                    {dayLabels[s.dayOfWeek]}
                  </span>
                  <span className="ms-2 font-mono" dir="ltr">
                    {utcMinuteToLocal(s.startMinuteUtc)} →{" "}
                    {utcMinuteToLocal(s.endMinuteUtc)}
                  </span>
                  <span className="ms-2 text-[10px] text-text-muted">
                    ({isAr ? "بتوقيتك" : "your timezone"})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-[#D32F2F] px-2 py-1 text-[10px] font-bold text-[#D32F2F]"
                >
                  <Trash2 size={10} />
                  {isAr ? "حذف" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
