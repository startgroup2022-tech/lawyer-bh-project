"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Eye, FileSignature, Loader2, Pencil, Send, X } from "lucide-react";
import type { TermsVersion } from "@/lib/terms-management/types";

const fieldClass = "w-full rounded-2xl border border-gray-200 bg-white p-4 text-sm font-medium text-[#082B67] outline-none transition focus:border-[#B4232A]";
const cardClass = "rounded-3xl border border-transparent bg-white p-5 shadow-sm transition hover:border-white focus-within:border-white";
const validPercentage = (value: string) => /^\d{1,3}(?:\.\d{1,2})?$/.test(value) && Number(value) >= 0 && Number(value) <= 100;
const lawyerShare = (value: number) => (100 - value).toFixed(2);

export default function LawyerTermsAdminContent({ isAr }: { isAr: boolean }) {
  const [versions, setVersions] = useState<TermsVersion[]>([]);
  const [contentAr, setContentAr] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [platformPercentageYearOne, setPlatformPercentageYearOne] = useState("20.00");
  const [platformPercentageYearTwo, setPlatformPercentageYearTwo] = useState("45.00");
  const [commissionMode, setCommissionMode] = useState<"fixed" | "yearly">("yearly");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<"ar" | "en" | null>(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/terms?documentType=lawyer_registration", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "request_failed");
      setVersions(data.versions ?? []);
    } catch { setMessage({ tone: "error", text: isAr ? "تعذر تحميل شروط تسجيل المحامين." : "Could not load lawyer registration terms." }); }
    finally { setBusy(false); }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);
  const history = useMemo(() => [...versions].sort((a, b) => b.version - a.version), [versions]);
  const published = versions.find((item) => item.status === "published");

  async function request(url: string, method: "POST" | "PATCH", body: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "request_failed");
    return data;
  }

  function startDraft(version?: TermsVersion) {
    setEditingId(version?.status === "draft" ? version.id : null);
    setContentAr(version?.contentAr ?? published?.contentAr ?? "");
    setContentEn(version?.contentEn ?? published?.contentEn ?? "");
    setPlatformPercentageYearOne(version?.platformPercentageYearOne ?? published?.platformPercentageYearOne ?? "20.00");
    setPlatformPercentageYearTwo(version?.platformPercentageYearTwo ?? published?.platformPercentageYearTwo ?? "45.00");
    setCommissionMode(version?.platformPercentageYearOne === version?.platformPercentageYearTwo && !!version ? "fixed" : "yearly");
    setPreview(null); setMessage(null);
  }

  async function saveDraft() {
    setSaving(true); setMessage(null);
    try {
      const body = { documentType: "lawyer_registration", contentAr, contentEn, platformPercentageYearOne, platformPercentageYearTwo: commissionMode === "fixed" ? platformPercentageYearOne : platformPercentageYearTwo };
      await request(editingId ? `/api/admin/terms/${editingId}` : "/api/admin/terms", editingId ? "PATCH" : "POST", body);
      setMessage({ tone: "success", text: isAr ? "تم حفظ المسودة." : "Draft saved." });
      setEditingId(null); setContentAr(""); setContentEn(""); await load();
    } catch { setMessage({ tone: "error", text: isAr ? "تعذر الحفظ. راجع اللغتين والنسب." : "Could not save. Check both languages and percentages." }); }
    finally { setSaving(false); }
  }

  async function publishVersion(version: TermsVersion) {
    if (saving || version.status === "published") return;
    if (!window.confirm(isAr ? `سيتم نشر النسخة ${version.version} وأرشفة النسخة المنشورة الحالية من شروط تسجيل المحامين فقط. ستبقى المسودات وموافقات المحامين السابقة دون تغيير. هل تريد المتابعة؟` : `Version ${version.version} will be published and only the current lawyer registration terms publication will be archived. Drafts and existing lawyer acceptances will remain unchanged. Continue?`)) return;
    setSaving(true);
    try { await request(`/api/admin/terms/${version.id}/publish`, "POST", { confirmation: "PUBLISH" }); setMessage({ tone: "success", text: isAr ? "تم نشر النسخة." : "Version published." }); await load(); }
    catch { setMessage({ tone: "error", text: isAr ? "تعذر نشر النسخة." : "Could not publish version." }); }
    finally { setSaving(false); }
  }

  async function archiveVersion(version: TermsVersion) {
    if (!window.confirm(isAr ? "هل تريد أرشفة هذه النسخة؟" : "Archive this version?")) return;
    setSaving(true);
    try { await request(`/api/admin/terms/${version.id}`, "PATCH", { action: "archive" }); setMessage({ tone: "success", text: isAr ? "تمت أرشفة النسخة." : "Version archived." }); await load(); }
    catch { setMessage({ tone: "error", text: isAr ? "تعذر أرشفة النسخة." : "Could not archive version." }); }
    finally { setSaving(false); }
  }

  async function requestAcceptanceCampaign() {
    if (!published || saving) return;
    if (!window.confirm(isAr ? `هل تريد إرسال طلب الموافقة على النسخة ${published.version} للمحامين السابقين؟\n\nتنبيه: سيتم إيقاف وصول المحامين المشمولين إلى طلبات العملاء حتى يوافقوا على الشروط.\n\nاضغط موافق للإرسال أو إلغاء للتراجع.` : `Send an acceptance request for version ${published.version} to existing lawyers?\n\nWarning: affected lawyers will lose access to customer requests until they accept the terms.\n\nPress OK to send or Cancel to go back.`)) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/lawyer-terms/request-acceptance", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({versionId:published.id,confirmation:"REQUEST_ACCEPTANCE"})});
      const data = await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error??"request_failed");
      setMessage({tone:"success",text:isAr?`تم إرسال طلب الموافقة إلى ${data.targeted??0} محامي.`:`Acceptance requested from ${data.targeted??0} lawyers.`});
    } catch { setMessage({tone:"error",text:isAr?"تعذر إرسال طلبات الموافقة.":"Could not request acceptance."}); }
    finally { setSaving(false); }
  }

  const percentagesValid = validPercentage(platformPercentageYearOne) && validPercentage(platformPercentageYearTwo);
  return <main className="min-h-screen bg-[#F7F8FA] px-4 py-8 text-[#082B67]"><div className="mx-auto max-w-7xl">
    <header className="rounded-3xl bg-gradient-to-br from-[#B4232A] to-[#74171C] p-6 text-white shadow-xl"><FileSignature className="h-10 w-10" /><h1 className="mt-3 text-3xl font-black">{isAr ? "شروط تسجيل المحامين" : "Lawyer Registration Terms"}</h1><p className="mt-2 text-sm text-white/75">{isAr ? "إدارة النص القانوني ونسب المنصة الافتراضية." : "Manage legal text and default platform shares."}</p></header>
    {message ? <div className={`my-5 flex items-center gap-2 rounded-xl border p-3 text-sm font-bold ${message.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}><span className="flex-1">{message.text}</span><button onClick={() => setMessage(null)}><X className="h-4 w-4" /></button></div> : null}
    {busy ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#B4232A]" /></div> : <>
      <section className={`${cardClass} mt-6`}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{editingId ? (isAr ? "تعديل المسودة" : "Edit draft") : (isAr ? "مسودة جديدة" : "New draft")}</h2><p className="text-xs text-gray-500">{isAr ? "أكمل اللغتين والنسب قبل الحفظ." : "Complete both languages and percentages before saving."}</p></div><button onClick={() => setPreview(preview ? null : (isAr ? "ar" : "en"))} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black"><Eye className="h-4 w-4" />{isAr ? "معاينة" : "Preview"}</button></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2"><label className="space-y-2"><span className="text-sm font-black">المحتوى بالعربية</span><textarea dir="rtl" rows={12} className={fieldClass} value={contentAr} onChange={(event) => setContentAr(event.target.value)} /></label><label className="space-y-2"><span className="text-sm font-black">English content</span><textarea dir="ltr" rows={12} className={fieldClass} value={contentEn} onChange={(event) => setContentEn(event.target.value)} /></label></div>
        <label className="mt-4 block space-y-2"><span className="text-sm font-black">{isAr ? "طريقة احتساب النسبة" : "Commission mode"}</span><select value={commissionMode} onChange={event => setCommissionMode(event.target.value as "fixed" | "yearly")} className={fieldClass}><option value="fixed">{isAr ? "نسبة ثابتة" : "Fixed rate"}</option><option value="yearly">{isAr ? "حسب السنوات" : "Year-based rates"}</option></select></label><div className="mt-4 grid gap-4 md:grid-cols-2"><PercentageField label={commissionMode === "fixed" ? (isAr ? "النسبة الثابتة" : "Fixed rate") : (isAr ? "السنة الأولى" : "Year one")} value={platformPercentageYearOne} setValue={setPlatformPercentageYearOne} isAr={isAr} />{commissionMode === "yearly" ? <PercentageField label={isAr ? "من السنة الثانية" : "Year two"} value={platformPercentageYearTwo} setValue={setPlatformPercentageYearTwo} isAr={isAr} /> : null}</div>
        {preview ? <article dir={preview === "ar" ? "rtl" : "ltr"} className="mt-5 rounded-2xl bg-[#F7F8FA] p-5"><div className="mb-4 flex gap-2"><button onClick={() => setPreview("ar")} className="rounded-full bg-white px-3 py-1 text-xs font-black">العربية</button><button onClick={() => setPreview("en")} className="rounded-full bg-white px-3 py-1 text-xs font-black">English</button></div><p className="whitespace-pre-wrap text-sm leading-8 text-gray-600">{preview === "ar" ? contentAr : contentEn}</p></article> : null}
        <button disabled={saving || !contentAr.trim() || !contentEn.trim() || !percentagesValid} onClick={() => void saveDraft()} className="mt-5 rounded-xl bg-[#B4232A] px-6 py-3 text-sm font-black text-white disabled:opacity-50">{isAr ? "حفظ المسودة" : "Save draft"}</button>
      </section>
      {published ? <section className="mt-6 rounded-3xl border border-transparent bg-[#082B67] p-5 text-white shadow-sm transition hover:border-white"><h2 className="text-lg font-black text-white">{isAr?"موافقة المحامين السابقين":"Existing lawyer acceptance"}</h2><p className="mt-2 text-sm text-white/90">{isAr?"بعد التأكيد سيُمنع المحامي من الوصول للطلبات حتى يوافق على النسخة المنشورة.":"After confirmation, request access is blocked until the published version is accepted."}</p><button disabled={saving} onClick={()=>void requestAcceptanceCampaign()} className="mt-4 rounded-xl border border-transparent bg-[#B4232A] px-5 py-3 text-sm font-black text-white transition hover:border-white hover:bg-[#991B22] disabled:cursor-not-allowed disabled:opacity-60">{isAr?"إرسال طلب الموافقة للمحامين السابقين":"Request acceptance from existing lawyers"}</button></section>:null}
      <section className="mt-6"><h2 className="mb-3 text-xl font-black">{isAr ? "سجل النسخ" : "Version history"}</h2><div className="space-y-3">{history.map((version) => <article key={version.id} className={cardClass}><div className="flex flex-wrap items-center gap-3"><div className="flex-1"><h3 className="font-black">{isAr ? `النسخة ${version.version}` : `Version ${version.version}`}</h3><p className="mt-1 text-xs text-gray-500">{isAr ? "المنصة" : "Platform"}: {version.platformPercentageYearOne}% / {version.platformPercentageYearTwo}%</p><span className="inline-flex rounded-full bg-[#F7F8FA] px-3 py-1 text-xs font-bold">{version.status === "draft" ? (isAr ? "مسودة" : "Draft") : version.status === "published" ? (isAr ? "منشور" : "Published") : (isAr ? "مؤرشف" : "Archived")}</span></div>{version.status !== "draft" ? <button onClick={() => startDraft(version)} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black">{isAr ? "نسخ إلى مسودة للتعديل" : "Copy to editable draft"}</button> : null}{version.status === "draft" ? <><button onClick={() => startDraft(version)} className="rounded-xl border p-2"><Pencil className="h-4 w-4" /></button><button disabled={saving} onClick={() => void publishVersion(version)} className="inline-flex items-center gap-2 rounded-xl bg-[#082B67] px-4 py-2 text-xs font-black text-white"><Send className="h-4 w-4" />{isAr ? "نشر" : "Publish"}</button></> : null}{version.status === "archived" ? <button disabled={saving} onClick={() => void publishVersion(version)} className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-[#082B67] px-4 py-2 text-xs font-black text-white transition hover:border-white disabled:opacity-50"><Send className="h-4 w-4" />{isAr ? "إعادة النشر" : "Republish"}</button> : null}{version.status === "draft" ? <button disabled={saving} onClick={() => void archiveVersion(version)} className="rounded-xl border p-2 text-red-700"><Archive className="h-4 w-4" /></button> : null}</div></article>)}{!history.length ? <div className={cardClass}>{isAr ? "لا توجد نسخ بعد." : "No versions yet."}</div> : null}</div></section>
    </>}</div></main>;
}

function PercentageField({ label, value, setValue, isAr }: { label: string; value: string; setValue: (value: string) => void; isAr: boolean }) {
  const valid = validPercentage(value);
  return <label className={`${cardClass} space-y-2`}><span className="font-black">{label}</span><span className="block text-xs text-gray-500">{isAr ? "نسبة المنصة" : "Platform share"}</span><div className="relative"><input inputMode="decimal" className={fieldClass} value={value} onChange={(event) => setValue(event.target.value)} /><span className="absolute end-4 top-4">%</span></div><p className={valid ? "text-sm font-bold text-emerald-700" : "text-sm font-bold text-red-700"}>{isAr ? "نسبة المحامي" : "Lawyer share"}: {valid ? lawyerShare(Number(value)) : "—"}%</p></label>;
}
