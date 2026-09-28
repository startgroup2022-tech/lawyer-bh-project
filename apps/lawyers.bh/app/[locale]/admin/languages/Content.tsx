"use client";

import { FormEvent, useCallback, useEffect, useId, useState } from "react";
import { AlertCircle, CheckCircle2, Languages, Loader2, Plus, Save } from "lucide-react";
import { languageReadiness, type LanguageDirection, type PlatformLanguage } from "@/lib/countries/languages";

type LanguageInput = Pick<PlatformLanguage, "code" | "adminName" | "nativeName" | "direction">;
type LanguagePatch = Pick<PlatformLanguage, "adminName" | "nativeName" | "direction">;

const inputClass = "h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-[#082B67] outline-none transition focus:border-[#B4232A] focus:ring-4 focus:ring-red-50 disabled:bg-gray-100 disabled:text-gray-500";
const codePattern = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;

async function languageRequest(path: string, init?: RequestInit): Promise<PlatformLanguage> {
  const response = await fetch(path, init);
  const data = await response.json() as { ok?: boolean; language?: PlatformLanguage; error?: string };
  if (!response.ok || !data.language) throw new Error(data.error || "LANGUAGE_REQUEST_FAILED");
  return data.language;
}

export async function createDraftLanguage(input: LanguageInput) {
  const normalized: LanguageInput = {
    code: input.code.trim().toLowerCase(),
    adminName: input.adminName.trim(),
    nativeName: input.nativeName.trim(),
    direction: input.direction,
  };
  if (normalized.code.length > 35 || !codePattern.test(normalized.code)) throw new Error("INVALID_LANGUAGE_CODE");
  return languageRequest("/api/admin/languages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalized),
  });
}

export async function updateManagedLanguage(code: string, patch: LanguagePatch) {
  return languageRequest(`/api/admin/languages/${encodeURIComponent(code)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function publishManagedLanguage(language: PlatformLanguage) {
  if (!languageReadiness(language).catalogueReady) throw new Error("LANGUAGE_NOT_READY");
  return languageRequest(`/api/admin/languages/${encodeURIComponent(language.code)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publish: true }),
  });
}

function LanguageEditor({ language, isAr, busy, onSave, onPublish }: {
  language: PlatformLanguage;
  isAr: boolean;
  busy: boolean;
  onSave: (code: string, patch: LanguagePatch) => void;
  onPublish: (language: PlatformLanguage) => void;
}) {
  const prefix = useId();
  const [adminName, setAdminName] = useState(language.adminName);
  const [nativeName, setNativeName] = useState(language.nativeName);
  const [direction, setDirection] = useState<LanguageDirection>(language.direction);
  const readiness = languageReadiness({ ...language, adminName, nativeName, direction });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(language.code, { adminName: adminName.trim(), nativeName: nativeName.trim(), direction });
  }

  return <article className="rounded-3xl border border-transparent bg-white p-5 shadow-[0_14px_40px_rgba(7,17,31,0.055)] transition hover:border-[#B4232A] focus-within:border-[#B4232A]">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <code className="rounded-lg bg-[#082B67] px-2.5 py-1 text-xs font-black text-white" aria-label={isAr ? `رمز اللغة ${language.code}` : `Language code ${language.code}`}>{language.code}</code>
        <p className="mt-2 text-xs text-gray-500">{isAr ? "رمز اللغة ثابت بعد الإنشاء" : "The language code cannot be changed after creation"}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-black ${language.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
        {language.status === "published" ? (isAr ? "منشورة في الكتالوج" : "Published in catalogue") : (isAr ? "مسودة في الكتالوج" : "Catalogue draft")}
      </span>
    </div>
    <form className="space-y-3" onSubmit={submit}>
      <label className="block text-xs font-extrabold" htmlFor={`${prefix}-admin`}>{isAr ? "الاسم الإداري" : "Administrative name"}</label>
      <input id={`${prefix}-admin`} value={adminName} maxLength={100} required disabled={busy} onChange={(event) => setAdminName(event.target.value)} className={inputClass} />
      <label className="block text-xs font-extrabold" htmlFor={`${prefix}-native`}>{isAr ? "الاسم الأصلي" : "Native name"}</label>
      <input id={`${prefix}-native`} value={nativeName} maxLength={100} required disabled={busy} onChange={(event) => setNativeName(event.target.value)} className={inputClass} />
      <label className="block text-xs font-extrabold" htmlFor={`${prefix}-direction`}>{isAr ? "اتجاه الكتابة" : "Writing direction"}</label>
      <select id={`${prefix}-direction`} value={direction} disabled={busy} onChange={(event) => setDirection(event.target.value as LanguageDirection)} className={inputClass}>
        <option value="ltr">{isAr ? "من اليسار إلى اليمين (LTR)" : "Left to right (LTR)"}</option>
        <option value="rtl">{isAr ? "من اليمين إلى اليسار (RTL)" : "Right to left (RTL)"}</option>
      </select>
      <div className="space-y-2 rounded-2xl bg-[#F7F8FA] p-3 text-xs font-bold">
        <p className={readiness.catalogueReady ? "text-emerald-700" : "text-amber-700"}>{readiness.catalogueReady ? (isAr ? "بيانات كتالوج اللغة جاهزة" : "Language catalogue metadata ready") : (isAr ? "بيانات كتالوج اللغة غير مكتملة" : "Language catalogue metadata incomplete")}</p>
        <p className="text-[#53657D]">{isAr ? "تفعيل اللغة وترجمة اسم كل دولة يتمان من إدارة الدول" : "Enablement and each country name translation are managed in Country management"}</p>
        <p className={readiness.fullInterfaceReady ? "text-emerald-700" : "text-gray-500"}>{readiness.fullInterfaceReady ? (isAr ? "الواجهة العامة الكاملة جاهزة ومضمنة في الكود" : "Full public interface ready and source-controlled") : (isAr ? "الواجهة العامة الكاملة غير متاحة؛ نشر الكتالوج لا ينشئ صفحات أو مسارات عامة" : "Full public interface not ready; catalogue publication does not create public pages or routes")}</p>
        <p className="text-gray-500">{isAr ? "تبقى المسارات العامة محددة داخل الكود" : "Public routes remain source-controlled"}</p>
      </div>
      {!readiness.catalogueReady && <p className="text-xs font-bold text-amber-700">{isAr ? "أكمل الاسم الإداري والاسم الأصلي واتجاه الكتابة قبل النشر في الكتالوج" : "Complete the administrative name, native name, and direction before catalogue publication"}</p>}
      <div className="flex flex-wrap gap-2 pt-2">
        <button type="submit" disabled={busy || !readiness.catalogueReady} className="inline-flex items-center gap-2 rounded-xl bg-[#082B67] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Save className="h-4 w-4" />{isAr ? "حفظ التعديلات" : "Save changes"}</button>
        {language.status === "draft" && <button type="button" disabled={busy || !readiness.catalogueReady} onClick={() => onPublish({ ...language, adminName, nativeName, direction })} className="rounded-xl bg-[#B4232A] px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{isAr ? "نشر في كتالوج اللغات" : "Publish in language catalogue"}</button>}
      </div>
    </form>
  </article>;
}

export default function Content({ isAr, initialLanguages = null }: { isAr: boolean; initialLanguages?: PlatformLanguage[] | null }) {
  const [languages, setLanguages] = useState<PlatformLanguage[]>(initialLanguages ?? []);
  const [loading, setLoading] = useState(initialLanguages === null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [code, setCode] = useState("");
  const [adminName, setAdminName] = useState("");
  const [nativeName, setNativeName] = useState("");
  const [direction, setDirection] = useState<LanguageDirection>("ltr");
  const createPrefix = useId();

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/languages", { cache: "no-store" });
      const data = await response.json() as { languages?: PlatformLanguage[] };
      if (!response.ok || !Array.isArray(data.languages)) throw new Error();
      setLanguages(data.languages);
    } catch {
      setError(isAr ? "تعذر تحميل اللغات. حاول مرة أخرى." : "Could not load languages. Please try again.");
    } finally { setLoading(false); }
  }, [isAr]);

  useEffect(() => { if (initialLanguages === null) void load(); }, [initialLanguages, load]);

  function replaceLanguage(language: PlatformLanguage) {
    setLanguages((items) => items.map((item) => item.code === language.code ? language : item));
    setNotice(isAr ? "تم حفظ اللغة" : "Language saved");
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("create"); setError(""); setNotice("");
    try {
      const language = await createDraftLanguage({ code, adminName, nativeName, direction });
      setLanguages((items) => [...items, language].sort((a, b) => a.adminName.localeCompare(b.adminName)));
      setCode(""); setAdminName(""); setNativeName(""); setDirection("ltr");
      setNotice(isAr ? "أُضيفت اللغة كمسودة" : "Language added as a draft");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(message === "INVALID_LANGUAGE_CODE"
        ? (isAr ? "رمز اللغة غير صحيح. استخدم مثل ar أو en أو tr أو pt-br." : "Invalid language code. Use a value such as ar, en, tr, or pt-br.")
        : (isAr ? "تعذرت إضافة اللغة. تحقق من البيانات وحاول مجددًا." : "Could not add the language. Check the details and retry."));
    } finally { setBusy(null); }
  }

  async function save(code: string, patch: LanguagePatch) {
    setBusy(code); setError(""); setNotice("");
    try { replaceLanguage(await updateManagedLanguage(code, patch)); }
    catch { setError(isAr ? "تعذر حفظ اللغة." : "Could not save the language."); }
    finally { setBusy(null); }
  }

  async function publish(language: PlatformLanguage) {
    setBusy(language.code); setError(""); setNotice("");
    try {
      const updated = await updateManagedLanguage(language.code, {
        adminName: language.adminName.trim(),
        nativeName: language.nativeName.trim(),
        direction: language.direction,
      });
      replaceLanguage(await publishManagedLanguage(updated));
      setNotice(isAr ? "نُشرت اللغة في الكتالوج وأصبحت متاحة لبيانات الدول فقط؛ لم تُنشأ واجهة عامة" : "Published in the catalogue for country data only; no public interface was created");
    } catch { setError(isAr ? "تعذر نشر اللغة. أكمل البيانات المطلوبة وحاول مجددًا." : "Could not publish the language. Complete the required details and retry."); }
    finally { setBusy(null); }
  }

  return <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#F7F8FA] px-4 pb-10 pt-4 text-[#082B67] sm:px-5"><div className="mx-auto max-w-6xl">
    <section className="mb-6 rounded-3xl bg-[linear-gradient(135deg,#B4232A_0%,#8E1820_100%)] p-7 text-white shadow-[0_22px_60px_rgba(180,35,42,0.24)]">
      <Languages className="mb-4 h-10 w-10" aria-hidden="true" /><h1 className="text-2xl font-black sm:text-3xl">{isAr ? "إدارة اللغات" : "Language management"}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-white/80">{isAr ? "أضف لغات المنصة وأدر بيانات الكتالوج. النشر في الكتالوج يجعل اللغة متاحة لبيانات الدول فقط، ولا ينشئ واجهة أو مسارًا عامًا." : "Manage the platform language catalogue. Catalogue publication makes a language available for country data only; it does not create a public interface or route."}</p>
    </section>
    {error && <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span><button type="button" onClick={load} disabled={!!busy} className="rounded-lg bg-white px-3 py-1.5 shadow-sm">{isAr ? "إعادة المحاولة" : "Retry"}</button></div>}
    {notice && <div role="status" className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{notice}</div>}
    <section className="mb-6 rounded-3xl bg-white p-5 shadow-[0_14px_40px_rgba(7,17,31,0.055)]" aria-labelledby={`${createPrefix}-title`}>
      <h2 id={`${createPrefix}-title`} className="text-lg font-black">{isAr ? "إضافة لغة جديدة" : "Add a new language"}</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={create}>
        <label className="text-xs font-extrabold" htmlFor={`${createPrefix}-code`}>{isAr ? "رمز اللغة" : "Language code"}</label><span className="hidden md:block" />
        <input id={`${createPrefix}-code`} aria-label={isAr ? "رمز اللغة" : "Language code"} value={code} required maxLength={35} dir="ltr" autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => setCode(event.target.value)} placeholder="tr" className={inputClass} />
        <p className="self-center text-xs text-gray-500">{isAr ? "لا يمكن تغيير الرمز بعد الإنشاء" : "The code cannot be changed after creation"}</p>
        <label className="text-xs font-extrabold" htmlFor={`${createPrefix}-admin`}>{isAr ? "الاسم الإداري" : "Administrative name"}</label><label className="text-xs font-extrabold" htmlFor={`${createPrefix}-native`}>{isAr ? "الاسم الأصلي" : "Native name"}</label>
        <input id={`${createPrefix}-admin`} value={adminName} required maxLength={100} onChange={(event) => setAdminName(event.target.value)} className={inputClass} />
        <input id={`${createPrefix}-native`} value={nativeName} required maxLength={100} onChange={(event) => setNativeName(event.target.value)} className={inputClass} />
        <label className="text-xs font-extrabold" htmlFor={`${createPrefix}-direction`}>{isAr ? "اتجاه الكتابة" : "Writing direction"}</label><span className="hidden md:block" />
        <select id={`${createPrefix}-direction`} value={direction} onChange={(event) => setDirection(event.target.value as LanguageDirection)} className={inputClass}><option value="ltr">{isAr ? "من اليسار إلى اليمين (LTR)" : "Left to right (LTR)"}</option><option value="rtl">{isAr ? "من اليمين إلى اليسار (RTL)" : "Right to left (RTL)"}</option></select>
        <div className="flex items-end"><button type="submit" disabled={busy === "create"} className="inline-flex items-center gap-2 rounded-xl bg-[#B4232A] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{isAr ? "إضافة كمسودة للكتالوج" : "Add as catalogue draft"}</button></div>
      </form>
    </section>
    {loading ? <div role="status" className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm font-bold text-gray-500"><Loader2 className="h-8 w-8 animate-spin text-[#B4232A]" />{isAr ? "جاري تحميل اللغات…" : "Loading languages…"}</div> : <section aria-label={isAr ? "قائمة اللغات" : "Language catalogue"} className="grid gap-5 md:grid-cols-2">{languages.map((language) => <LanguageEditor key={language.code} language={language} isAr={isAr} busy={busy === language.code} onSave={(itemCode, patch) => void save(itemCode, patch)} onPublish={(item) => void publish(item)} />)}</section>}
    {!loading && languages.length === 0 && <p className="rounded-3xl bg-white py-12 text-center text-sm font-bold text-gray-500">{isAr ? "لا توجد لغات بعد" : "No languages yet"}</p>}
  </div></main>;
}
