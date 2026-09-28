"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Eye, FileText, Loader2, Pencil, Send, X } from "lucide-react";
import type { TermsVersion } from "@/lib/terms-management/types";

const fieldClass = "min-h-72 w-full rounded-2xl border border-gray-200 bg-white p-4 text-sm font-medium leading-7 text-[#082B67] outline-none transition focus:border-[#B4232A]";
const cardClass = "rounded-3xl border border-transparent bg-white p-5 shadow-sm transition hover:border-white focus-within:border-white";

export default function TermsAdminContent({ isAr, documentType = "general" }: { isAr: boolean; documentType?: "general" | "legalsos_terms" | "legalsos_privacy" | "legalsos_lawyer_agreement" }) {
  const [versions, setVersions] = useState<TermsVersion[]>([]);
  const [contentAr, setContentAr] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<"ar" | "en" | null>(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/terms?documentType=${documentType}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "request_failed");
      setVersions(data.versions ?? []);
    } catch {
      setMessage({ tone: "error", text: isAr ? "تعذر تحميل الشروط العامة." : "Could not load general terms." });
    } finally {
      setBusy(false);
    }
  }, [isAr, documentType]);

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
    setPreview(null);
    setMessage(null);
  }

  async function saveDraft() {
    setSaving(true); setMessage(null);
    try {
      const body = { documentType, contentAr, contentEn };
      await request(editingId ? `/api/admin/terms/${editingId}` : "/api/admin/terms", editingId ? "PATCH" : "POST", body);
      setMessage({ tone: "success", text: isAr ? "تم حفظ المسودة." : "Draft saved." });
      setEditingId(null); setContentAr(""); setContentEn(""); await load();
    } catch {
      setMessage({ tone: "error", text: isAr ? "تعذر حفظ المسودة. أكمل المحتوى باللغتين." : "Could not save draft. Complete both languages." });
    } finally { setSaving(false); }
  }

  async function publishVersion(version: TermsVersion) {
    if (saving || version.status === "published") return;
    if (!window.confirm(isAr ? `سيتم نشر النسخة ${version.version} وأرشفة النسخة المنشورة الحالية من نفس نوع الوثيقة فقط. ستبقى المسودات دون تغيير. هل تريد المتابعة؟` : `Version ${version.version} will be published and only the current publication of the same document type will be archived. Drafts will remain unchanged. Continue?`)) return;
    setSaving(true);
    try {
      await request(`/api/admin/terms/${version.id}/publish`, "POST", { confirmation: "PUBLISH" });
      setMessage({ tone: "success", text: isAr ? "تم نشر النسخة." : "Version published." }); await load();
    } catch { setMessage({ tone: "error", text: isAr ? "تعذر نشر النسخة." : "Could not publish version." }); }
    finally { setSaving(false); }
  }

  async function archiveVersion(version: TermsVersion) {
    if (!window.confirm(isAr ? "هل تريد أرشفة هذه النسخة؟" : "Archive this version?")) return;
    setSaving(true);
    try {
      await request(`/api/admin/terms/${version.id}`, "PATCH", { action: "archive" });
      setMessage({ tone: "success", text: isAr ? "تمت أرشفة النسخة." : "Version archived." }); await load();
    } catch { setMessage({ tone: "error", text: isAr ? "تعذر أرشفة النسخة." : "Could not archive version." }); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-[#F7F8FA] px-4 py-8 text-[#082B67]">
    <div className="mx-auto max-w-7xl">
      <header className="rounded-3xl bg-gradient-to-br from-[#B4232A] to-[#74171C] p-6 text-white shadow-xl">
        <FileText className="mt-8 h-10 w-10" />
        <h1 className="mt-3 text-3xl font-black">{documentType === "legalsos_lawyer_agreement" ? (isAr ? "اتفاقية المحامي (النجدة القانونية)" : "Lawyer Agreement (LegalSOS)") : documentType === "legalsos_privacy" ? (isAr ? "سياسة الخصوصية (النجدة القانونية)" : "Privacy Policy (LegalSOS)") : documentType === "legalsos_terms" ? (isAr ? "الشروط والأحكام (النجدة القانونية)" : "Terms & Conditions (LegalSOS)") : (isAr ? "إدارة الشروط والأحكام العامة" : "General Terms Management")}</h1>
        <nav className="mt-4 flex flex-wrap gap-4 text-sm underline">
          <a href={`/${isAr ? "ar" : "en"}/admin/legalsos-legal/lawyer-agreement`}>{isAr ? "اتفاقية المحامي (النجدة القانونية)" : "Lawyer Agreement (LegalSOS)"}</a>
          <a href={`/${isAr ? "ar" : "en"}/admin/terms`}>{isAr ? "شروط الموقع" : "Website terms"}</a>
          <a href={`/${isAr ? "ar" : "en"}/admin/legalsos-legal/terms`}>{isAr ? "الشروط والأحكام (النجدة القانونية)" : "Terms & Conditions (LegalSOS)"}</a>
          <a href={`/${isAr ? "ar" : "en"}/admin/legalsos-legal/privacy`}>{isAr ? "سياسة الخصوصية (النجدة القانونية)" : "Privacy Policy (LegalSOS)"}</a>
        </nav>
        <p className="mt-2 text-sm text-white/75">{isAr ? "أنشئ مسودة ثنائية اللغة وعاينها قبل النشر." : "Create and preview a bilingual draft before publishing."}</p>
      </header>

      {message ? <div className={`my-5 flex items-center gap-2 rounded-xl border p-3 text-sm font-bold ${message.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}><span className="flex-1">{message.text}</span><button aria-label={isAr ? "إغلاق" : "Close"} onClick={() => setMessage(null)}><X className="h-4 w-4" /></button></div> : null}

      {busy ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#B4232A]" /></div> : <>
        <section className={`${cardClass} mt-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{editingId ? (isAr ? "تعديل المسودة" : "Edit draft") : (isAr ? "مسودة جديدة" : "New draft")}</h2><p className="text-xs text-gray-500">{isAr ? "يجب تعبئة المحتوى بالعربية والإنجليزية." : "Arabic and English content are required."}</p></div><button type="button" onClick={() => setPreview(preview ? null : (isAr ? "ar" : "en"))} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black"><Eye className="h-4 w-4" />{isAr ? "معاينة" : "Preview"}</button></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2"><label className="space-y-2"><span className="text-sm font-black">المحتوى بالعربية</span><textarea dir="rtl" className={fieldClass} value={contentAr} onChange={(event) => setContentAr(event.target.value)} /></label><label className="space-y-2"><span className="text-sm font-black">English content</span><textarea dir="ltr" className={fieldClass} value={contentEn} onChange={(event) => setContentEn(event.target.value)} /></label></div>
          {preview ? <article dir={preview === "ar" ? "rtl" : "ltr"} className="mt-5 rounded-2xl bg-[#F7F8FA] p-5"><div className="mb-4 flex gap-2"><button onClick={() => setPreview("ar")} className="rounded-full bg-white px-3 py-1 text-xs font-black">العربية</button><button onClick={() => setPreview("en")} className="rounded-full bg-white px-3 py-1 text-xs font-black">English</button></div><h3 className="font-black">{preview === "ar" ? "معاينة الشروط العامة" : "General terms preview"}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-gray-600">{preview === "ar" ? contentAr : contentEn}</p></article> : null}
          <button disabled={saving || !contentAr.trim() || !contentEn.trim()} onClick={() => void saveDraft()} className="mt-5 rounded-xl bg-[#B4232A] px-6 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ المسودة" : "Save draft")}</button>
        </section>

        <section className="mt-6"><h2 className="mb-3 text-xl font-black">{isAr ? "سجل النسخ" : "Version history"}</h2><div className="space-y-3">{history.map((version) => <article key={version.id} className={cardClass}><div className="flex flex-wrap items-center gap-3"><div className="flex-1"><h3 className="font-black">{isAr ? `النسخة ${version.version}` : `Version ${version.version}`}</h3><span className="mt-1 inline-flex rounded-full bg-[#F7F8FA] px-3 py-1 text-xs font-bold">{version.status === "draft" ? (isAr ? "مسودة" : "Draft") : version.status === "published" ? (isAr ? "منشور" : "Published") : (isAr ? "مؤرشف" : "Archived")}</span></div>{version.status !== "draft" ? <button onClick={() => startDraft(version)} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black">{isAr ? "نسخ إلى مسودة للتعديل" : "Copy to editable draft"}</button> : null}{version.status === "draft" ? <><button onClick={() => startDraft(version)} className="rounded-xl border p-2" aria-label={isAr ? "تعديل المسودة" : "Edit draft"}><Pencil className="h-4 w-4" /></button><button disabled={saving} onClick={() => void publishVersion(version)} className="inline-flex items-center gap-2 rounded-xl bg-[#082B67] px-4 py-2 text-xs font-black text-white"><Send className="h-4 w-4" />{isAr ? "نشر" : "Publish"}</button></> : null}{version.status === "archived" ? <button disabled={saving} onClick={() => void publishVersion(version)} className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-[#082B67] px-4 py-2 text-xs font-black text-white transition hover:border-white disabled:opacity-50"><Send className="h-4 w-4" />{isAr ? "إعادة النشر" : "Republish"}</button> : null}{version.status === "draft" ? <button disabled={saving} onClick={() => void archiveVersion(version)} className="rounded-xl border p-2 text-red-700" aria-label={isAr ? "أرشفة النسخة" : "Archive version"}><Archive className="h-4 w-4" /></button> : null}</div></article>)}{history.length === 0 ? <div className={cardClass}>{isAr ? "لا توجد نسخ بعد." : "No versions yet."}</div> : null}</div></section>
      </>}
    </div>
  </main>;
}
