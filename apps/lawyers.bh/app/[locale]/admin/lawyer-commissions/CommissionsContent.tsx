"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Percent, Search } from "lucide-react";
type Row = {
  lawyerId: string;
  countryCode: string;
  fullNameAr: string;
  fullNameEn: string;
  email: string;
  platformPercentage: string;
  providerPercentage: string;
  hasOverride: boolean;
};
export default function CommissionsContent({ isAr }: { isAr: boolean }) {
  const [rows, setRows] = useState<Row[]>([]),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true),
    [editing, setEditing] = useState<Row | null>(null),
    [value, setValue] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError("");
    try { const r = await fetch(
      `/api/admin/lawyer-commissions?query=${encodeURIComponent(query)}`,
      { cache: "no-store", signal: AbortSignal.timeout(15000) },
    );
    const d = await r.json();
    if (!r.ok || !d.ok || !Array.isArray(d.lawyers)) throw new Error("load_failed");
    if (current === requestId.current) setRows(d.lawyers);
    } catch { if (current === requestId.current) setError(isAr ? "تعذر تحميل النسب. حاول مرة أخرى." : "Could not load commissions. Please retry."); }
    finally { if (current === requestId.current) setLoading(false); }
  }, [query, isAr]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save() {
    if (!editing || saving) return;
    setSaving(true); setError("");
    try { const r = await fetch("/api/admin/lawyer-commissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lawyerId: editing.lawyerId,
        countryCode: editing.countryCode,
        platformPercentage: value,
        effectiveFrom: new Date().toISOString(),
        reason: "Admin override",
      }),
    });
    if (!r.ok) throw new Error("save_failed");
    {
      setEditing(null);
      await load();
    } } catch { setError(isAr ? "تعذر حفظ النسبة. راجع القيمة وحاول مجدداً." : "Could not save the rate. Check the value and retry."); }
    finally { setSaving(false); }
  }
  return (
    <main
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen bg-[#F7F8FA] px-5 py-10"
    >
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl bg-gradient-to-br from-[#082B67] to-[#061A3D] p-7 text-white">
          <Percent className="h-9 w-9" />
          <h1 className="mt-4 text-3xl font-black">
            {isAr ? "نسب المحامين والمنصة" : "Lawyer and platform commissions"}
          </h1>
          <p className="mt-2 text-white/70">
            {isAr
              ? "عرض كل محامي وتعديل نسبته من تاريخ التعديل دون تغيير العمليات السابقة."
              : "Review every lawyer and apply a new rate without changing past transactions."}
          </p>
        </header>
        {error ? <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}<button onClick={() => void load()} className="ms-3 underline">{isAr ? "إعادة المحاولة" : "Retry"}</button></div> : null}
        <div className="mt-6 flex rounded-2xl bg-white p-3 shadow-sm">
          <Search className="m-2 h-5 w-5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isAr ? "ابحث بالاسم أو البريد" : "Search name or email"
            }
            className="w-full outline-none"
          />
        </div>
        <div className="mt-5 grid gap-3">
          {!loading && !error && !rows.length ? <p>{isAr ? "لا يوجد محامون مطابقون للبحث." : "No matching lawyers found."}</p> : null}
          {loading ? (
            <p>{isAr ? "جارٍ التحميل..." : "Loading..."}</p>
          ) : (
            rows.map((row) => (
              <button
                key={row.lawyerId}
                onClick={() => {
                  setEditing(row);
                  setValue(row.platformPercentage);
                }}
                className="rounded-3xl border border-transparent bg-white p-5 text-start shadow-sm transition hover:border-white hover:shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-[#082B67]">
                      {(isAr ? row.fullNameAr : row.fullNameEn) ||
                        row.fullNameAr ||
                        row.fullNameEn}
                    </p>
                    <p className="text-sm text-slate-500">
                      {row.email} · {row.countryCode}
                    </p>
                  </div>
                  <div className="flex gap-2 text-sm font-bold">
                    <span className="rounded-xl bg-red-50 px-3 py-2 text-[#B4232A]">
                      {isAr ? "المنصة" : "Platform"} {row.platformPercentage}%
                    </span>
                    <span className="rounded-xl bg-blue-50 px-3 py-2 text-[#082B67]">
                      {isAr ? "المحامي" : "Lawyer"} {row.providerPercentage}%
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        {editing ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6">
              <h2 className="text-xl font-black text-[#082B67]">
                {isAr ? "تعديل نسبة المنصة" : "Edit platform share"}
              </h2>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-5 w-full rounded-xl bg-[#F7F8FA] p-3 outline-none"
              />
              <p className="mt-2 text-sm text-slate-500">
                {isAr
                  ? `نسبة المحامي: ${(100 - Number(value || 0)).toFixed(2)}%`
                  : `Lawyer share: ${(100 - Number(value || 0)).toFixed(2)}%`}
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  disabled={saving || !/^\d{1,3}(?:\.\d{1,2})?$/.test(value) || Number(value) > 100}
                  onClick={() => void save()}
                  className="flex-1 rounded-xl bg-[#B4232A] p-3 font-bold text-white disabled:opacity-50"
                >
                  {saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-xl bg-slate-100 p-3 font-bold"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
