"use client";
import { prepareDirectForm } from "@/lib/uploads/client";

import { useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import AdminPagination from "../../_components/AdminPagination";
import { paginateItems } from "../../_components/pagination";

type Result = { rowNumber: number; fullNameAr: string; fullNameEn: string; phone: string; email: string; status: "success" | "skipped" | "failed"; reason?: string; completionLink?: string };

export default function Content({ locale }: { locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const [file, setFile] = useState<File | null>(null);
  const [countryCode, setCountryCode] = useState("BH");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ summary: { success: number; skipped: number; failed: number }; results: Result[]; truncated?: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const pagination = paginateItems(data?.results ?? [], page);

  async function submit() {
    if (!file) { setError(ar ? "اختر ملف Excel أولًا." : "Choose an Excel file first."); return; }
    setLoading(true); setError(""); setData(null);
    const body = new FormData(); body.set("file", file); body.set("countryCode", countryCode);
    try {
    const response = await fetch("/api/admin/lawyers/import", { method: "POST", body: await prepareDirectForm(body, 'import', setUploadProgress) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) setError(ar ? `تعذر استيراد الملف: ${json.error || "خطأ غير معروف"}` : `Import failed: ${json.error || "Unknown error"}`);
    else { setData(json); setPage(1); }
    } catch (error) {
      setError(error instanceof Error ? error.message : (ar ? 'تعذر رفع الملف. حاول مجددًا.' : 'Upload failed. Please retry.'));
    } finally { setLoading(false); }
  }

  return <main className="min-h-screen bg-[#F7F8FA] px-5 py-10" dir={ar ? "rtl" : "ltr"}>
    <div className="mx-auto max-w-6xl">
      <div className="mb-6"><h1 className="text-3xl font-black text-[#082B67]">{ar ? "رفع المحامين" : "Import lawyers"}</h1><p className="mt-2 text-sm text-slate-500">{ar ? "أضف المحامين دفعة واحدة وأرسل روابط إكمال الملف تلقائيًا." : "Add lawyers in bulk and send profile completion links automatically."}</p></div>
      <section className="rounded-3xl border border-transparent bg-white transition hover:border-[#B4232A] focus-within:border-[#B4232A] p-6">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B4232A]/10 text-[#B4232A]"><FileSpreadsheet /></div>
        <h2 className="text-xl font-black text-[#082B67]">{ar ? "ملف Excel" : "Excel file"}</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">{ar ? "الصف الأول يجب أن يحتوي: الاسم بالعربي، الاسم بالإنجليزي (اختياري)، رقم الهاتف، البريد الإلكتروني. الحد الأقصى 500 صف و5MB." : "The first row must contain: Arabic name, English name (optional), phone, and email. Maximum 500 rows and 5MB."}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-[160px_1fr_auto] md:items-end"><label className="text-sm font-bold text-[#082B67]">{ar ? "رمز الدولة" : "Country code"}<input value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))} className="mt-2 h-12 w-full rounded-xl border border-[#E6EAF0] px-4 uppercase outline-none focus:border-[#B4232A]" /></label><label className="text-sm font-bold text-[#082B67]">{ar ? "اختر الملف" : "Choose file"}<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-2 block h-12 w-full rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-sm" /></label><button onClick={submit} disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#B4232A] px-6 font-black text-white disabled:opacity-60"><Upload className="h-4 w-4" />{loading ? (ar ? "جاري الرفع..." : "Uploading...") : (ar ? "رفع وإرسال الدعوات" : "Import and invite")}</button></div>
        {loading && uploadProgress !== null && <p role="status">{ar ? 'رفع الملفات' : 'Uploading files'}: {uploadProgress}%</p>}
        {error && <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</p>}
      </section>
      {data && <section className="mt-6 space-y-5"><div className="grid gap-3 sm:grid-cols-3"><Summary label={ar ? "نجح" : "Successful"} value={data.summary.success} tone="green" /><Summary label={ar ? "تم التجاوز" : "Skipped"} value={data.summary.skipped} tone="amber" /><Summary label={ar ? "خطأ" : "Failed"} value={data.summary.failed} tone="red" /></div>{data.truncated && <p className="rounded-2xl bg-amber-50 p-4 font-bold text-amber-800">{ar ? "تمت معالجة أول 500 صف فقط." : "Only the first 500 rows were processed."}</p>}<div className="overflow-hidden rounded-3xl border border-transparent bg-white transition hover:border-[#B4232A] focus-within:border-[#B4232A]"><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead className="bg-[#082B67] text-white"><tr><th className="p-4 text-start">#</th><th className="p-4 text-start">{ar ? "الاسم" : "Name"}</th><th className="p-4 text-start">{ar ? "البريد" : "Email"}</th><th className="p-4 text-start">{ar ? "الحالة" : "Status"}</th><th className="p-4 text-start">{ar ? "النتيجة / السبب" : "Result / reason"}</th></tr></thead><tbody>{pagination.items.map((row) => <tr key={row.rowNumber} className="border-t border-[#E6EAF0]"><td className="p-4 font-bold">{row.rowNumber}</td><td className="p-4 font-bold text-[#082B67]">{row.fullNameAr}{row.fullNameEn ? <span className="block text-xs font-normal text-slate-500">{row.fullNameEn}</span> : null}</td><td className="p-4">{row.email}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${row.status === "success" ? "bg-emerald-50 text-emerald-700" : row.status === "skipped" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{row.status === "success" ? (ar ? "نجح" : "Success") : row.status === "skipped" ? (ar ? "تم التجاوز" : "Skipped") : (ar ? "خطأ" : "Failed")}</span></td><td className="p-4 text-slate-600">{row.reason || (ar ? "تم إنشاء الحساب وإرسال الدعوة" : "Account created and invitation sent")}</td></tr>)}</tbody></table></div></div><AdminPagination isAr={ar} currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} /></section>}
    </div>
  </main>;
}

function Summary({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "red" }) {
  const colors = tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-800";
  return <div className={`rounded-2xl border p-5 ${colors}`}><p className="text-sm font-bold">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>;
}
