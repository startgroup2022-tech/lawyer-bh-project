"use client";

import { useMemo, useState } from "react";
import AdminPagination from "../../_components/AdminPagination";
import { paginateItems } from "../../_components/pagination";

type Item = {
  id: string;
  status: string;
  proposedValues: Record<string, unknown>;
  proposedFiles: Record<string, { fileName: string; mimeType: string }>;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  providerId: string;
  fullNameAr: string;
  fullNameEn: string;
  registrationNo: string;
  registrationLevel: string | null;
  ibanNumber: string | null;
  licenseExpiryDate: string | null;
  crNumber: string | null;
  subscriptionTypes: string[];
};

const labels: Record<string, { ar: string; en: string }> = {
  fullNameAr: { ar: "الاسم بالعربي", en: "Arabic name" },
  fullNameEn: { ar: "الاسم بالإنجليزي", en: "English name" },
  subscriptionTypes: { ar: "الأدوار", en: "Roles" },
  registrationNo: { ar: "رقم المحاماة", en: "Registration number" },
  registrationLevel: { ar: "درجة المحامي", en: "Registration level" },
  ibanNumber: { ar: "رقم الآيبان", en: "IBAN" },
  licenseExpiryDate: { ar: "تاريخ انتهاء الرخصة", en: "License expiry" },
  crNumber: { ar: "السجل التجاري", en: "Commercial registration" },
  profileImage: { ar: "الصورة الشخصية", en: "Profile image" },
  licenseFile: { ar: "ملف الرخصة", en: "License file" },
  ibanCertificate: { ar: "شهادة الآيبان", en: "IBAN certificate" },
  institutionLicense: { ar: "رخصة المؤسسة", en: "Institution license" },
  personalId: { ar: "البطاقة الشخصية", en: "Personal ID" },
  signature: { ar: "التوقيع", en: "Signature" },
};

function display(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

export default function Content({ locale, initialItems }: { locale: string; initialItems: Item[] }) {
  const isAr = locale === "ar";
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const visible = useMemo(() => filter === "all" ? items : items.filter((item) => item.status === filter), [filter, items]);
  const pagination = paginateItems(visible, page);

  async function decide(item: Item, action: "approve" | "reject") {
    const reason = action === "reject" ? window.prompt(isAr ? "اكتب سبب الرفض" : "Enter rejection reason")?.trim() : null;
    if (action === "reject" && !reason) return;
    if (action === "approve" && !window.confirm(isAr ? "اعتماد جميع التعديلات المعروضة؟" : "Approve all displayed changes?")) return;
    setBusy(item.id); setMessage("");
    const response = await fetch(`/api/admin/provider-profile-changes/${item.id}/${action}`, { method: "POST", headers: action === "reject" ? { "content-type": "application/json" } : undefined, body: action === "reject" ? JSON.stringify({ reason }) : undefined });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: data.request.status, rejectionReason: data.request.rejectionReason ?? null, reviewedAt: data.request.reviewedAt } : entry));
      setMessage(isAr ? "تم حفظ قرار المراجعة." : "Review decision saved.");
    } else setMessage(data.error ?? (isAr ? "تعذر حفظ القرار" : "Could not save decision"));
    setBusy(null);
  }

  return <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-gray-50 px-4 py-8 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-text-primary">{isAr ? "تعديلات الملفات الشخصية" : "Profile changes"}</h1><p className="mt-1 text-sm text-text-muted">{isAr ? "قارن البيانات المعتمدة بالتعديلات المقترحة." : "Compare approved details with proposed changes."}</p></div>
        <a href={`/${locale}/admin/approvals`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold">{isAr ? "طلبات الانضمام" : "Join approvals"}</a>
      </div>
      <div className="mb-5 flex gap-2">{["pending", "approved", "rejected", "all"].map((value) => <button key={value} onClick={() => { setFilter(value); setPage(1); }} className={`rounded-full px-4 py-2 text-sm font-bold ${filter === value ? "bg-primary text-white" : "bg-white text-text-muted"}`}>{value === "all" ? (isAr ? "الكل" : "All") : value === "pending" ? (isAr ? "بانتظار المراجعة" : "Pending") : value === "approved" ? (isAr ? "معتمد" : "Approved") : (isAr ? "مرفوض" : "Rejected")}</button>)}</div>
      {message ? <p className="mb-4 rounded-xl bg-white p-3 text-sm font-bold">{message}</p> : null}
      <div className="space-y-5">{pagination.items.map((item) => {
        const current = { fullNameAr: item.fullNameAr, fullNameEn: item.fullNameEn, registrationNo: item.registrationNo, registrationLevel: item.registrationLevel, ibanNumber: item.ibanNumber, licenseExpiryDate: item.licenseExpiryDate, crNumber: item.crNumber, subscriptionTypes: item.subscriptionTypes } as Record<string, unknown>;
        return <article key={item.id} className="rounded-3xl border border-transparent bg-white transition hover:border-[#B4232A] focus-within:border-[#B4232A] p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-extrabold">{isAr ? item.fullNameAr : item.fullNameEn}</h2><p className="text-xs text-text-muted">{new Date(item.updatedAt).toLocaleString(isAr ? "ar-BH" : "en-BH")}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{item.status}</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b text-text-muted"><th className="p-2 text-start">{isAr ? "الحقل" : "Field"}</th><th className="p-2 text-start">{isAr ? "المعتمد" : "Approved"}</th><th className="p-2 text-start">{isAr ? "المقترح" : "Proposed"}</th></tr></thead><tbody>{Object.entries(item.proposedValues).map(([key, value]) => <tr key={key} className="border-b"><td className="p-2 font-bold">{labels[key]?.[isAr ? "ar" : "en"] ?? key}</td><td className="p-2 text-text-muted">{display(current[key])}</td><td className="p-2">{display(value)}</td></tr>)}{Object.entries(item.proposedFiles).map(([key, file]) => <tr key={key} className="border-b"><td className="p-2 font-bold">{labels[key]?.[isAr ? "ar" : "en"] ?? key}</td><td className="p-2 text-text-muted">—</td><td className="p-2"><a target="_blank" rel="noreferrer" className="font-bold text-primary underline" href={`/api/admin/provider-profile-changes/${item.id}/file/${key}`}>{file.fileName}</a></td></tr>)}</tbody></table></div>
          {item.rejectionReason ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{item.rejectionReason}</p> : null}
          {item.status === "pending" ? <div className="mt-4 flex gap-2"><button disabled={busy === item.id} onClick={() => decide(item, "approve")} className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white">{isAr ? "موافقة" : "Approve"}</button><button disabled={busy === item.id} onClick={() => decide(item, "reject")} className="rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white">{isAr ? "رفض" : "Reject"}</button></div> : null}
        </article>;
      })}{visible.length === 0 ? <div className="rounded-3xl bg-white p-10 text-center text-text-muted">{isAr ? "لا توجد طلبات" : "No requests"}</div> : null}</div>
      <AdminPagination isAr={isAr} currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
    </div>
  </main>;
}
