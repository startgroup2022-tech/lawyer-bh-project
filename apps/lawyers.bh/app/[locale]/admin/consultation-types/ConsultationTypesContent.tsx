"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Archive, ArrowDown, ArrowUp, Loader2, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { ConsultationIconPicker } from "@/components/admin/ConsultationIconPicker";
import { getConsultationIcon } from "@/lib/consultation-icons/catalog";

type Country = { code: string; nameAr: string; nameEn: string; currencyCode: string };
type Method = { id: string; code: string; nameAr: string; nameEn: string; price: string; currencyCode: string; durationMinutes: number; iconKey: string; sortOrder: number; isActive: boolean };
type Form = { code: string; nameAr: string; nameEn: string; price: string; currencyCode: string; durationMinutes: string; iconKey: string };
const emptyForm = (currencyCode = "BHD"): Form => ({ code: "", nameAr: "", nameEn: "", price: "", currencyCode, durationMinutes: "30", iconKey: "phone" });
const inputClass = "mt-2 h-12 w-full rounded-xl border border-transparent bg-[#F3F6FA] px-4 text-sm font-bold text-[#082B67] outline-none transition focus:border-[#B4232A] disabled:bg-gray-100";

export default function ConsultationTypesContent({ isAr }: { isAr: boolean }) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryCode, setCountryCode] = useState("");
  const [items, setItems] = useState<Method[]>([]);
  const [form, setForm] = useState<Form>(emptyForm());
  const [editing, setEditing] = useState<Method | null>(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/consultation-types/countries", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) throw new Error();
        const next = (data.countries ?? []) as Country[];
        setCountries(next);
        const preferred = next.find((country) => country.code === "BH") ?? next[0];
        if (preferred) { setCountryCode(preferred.code); setForm(emptyForm(preferred.currencyCode)); }
        else setBusy(false);
      })
      .catch(() => { setMessage(isAr ? "تعذر تحميل الدول" : "Could not load countries"); setBusy(false); });
    return () => { active = false; };
  }, [isAr]);

  const load = useCallback(async () => {
    if (!countryCode) return;
    setBusy(true);
    const response = await fetch(`/api/admin/consultation-types?countryCode=${encodeURIComponent(countryCode)}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setItems(data.methods ?? []);
    else setMessage(isAr ? "تعذر تحميل الأنواع" : "Could not load methods");
    setBusy(false);
  }, [countryCode, isAr]);
  // Loading is intentionally triggered whenever the selected country changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const selectedCountry = countries.find((country) => country.code === countryCode);
  function selectCountry(code: string) {
    const country = countries.find((item) => item.code === code);
    setCountryCode(code); setEditing(null); setItems([]); setMessage(""); setForm(emptyForm(country?.currencyCode));
  }
  async function request(url: string, method: string, body: Record<string, unknown>) {
    setSaving(true); setMessage("");
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, countryCode }) });
    const data = await response.json().catch(() => ({})); setSaving(false);
    if (!response.ok) { setMessage(String(data.error ?? (isAr ? "تعذر حفظ التغيير" : "Could not save"))); return false; }
    await load(); return true;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = { ...form, durationMinutes: Number(form.durationMinutes) };
    if (await request(editing ? `/api/admin/consultation-types/${editing.id}` : "/api/admin/consultation-types", editing ? "PATCH" : "POST", editing ? { ...payload, code: undefined } : payload)) { setEditing(null); setForm(emptyForm(selectedCountry?.currencyCode)); }
  }
  function edit(method: Method) { setEditing(method); setForm({ code: method.code, nameAr: method.nameAr, nameEn: method.nameEn, price: method.price, currencyCode: method.currencyCode, durationMinutes: String(method.durationMinutes), iconKey: method.iconKey }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function archive(method: Method, action: "archive" | "restore") { if (action === "archive" && !confirm(isAr ? "أرشفة النوع وإخفاؤه من صفحة الحجز؟" : "Archive and hide this method from booking?")) return; await request(`/api/admin/consultation-types/${method.id}`, "PATCH", { action }); }
  async function remove(method: Method) { if (!confirm(isAr ? "تنبيه: هل تريد حذف نوع الاستشارة نهائيًا؟" : "Warning: permanently delete this consultation type?")) return; if (!confirm(isAr ? "تأكيد أخير: لا يمكن التراجع عن الحذف النهائي." : "Final confirmation: DELETE cannot be undone.")) return; await request(`/api/admin/consultation-types/${method.id}`, "DELETE", { confirmation: "DELETE" }); }
  async function move(list: Method[], index: number, delta: number) { const target = index + delta; if (target < 0 || target >= list.length) return; const next = [...list]; [next[index], next[target]] = [next[target], next[index]]; await request("/api/admin/consultation-types/reorder", "POST", { ids: next.map((item) => item.id) }); }

  const active = items.filter((item) => item.isActive);
  const archived = items.filter((item) => !item.isActive);
  const fields: { key: keyof Form; ar: string; en: string; type?: string }[] = [
    { key: "nameAr", ar: "الاسم بالعربي", en: "Arabic name" }, { key: "nameEn", ar: "الاسم بالإنجليزي", en: "English name" },
    { key: "code", ar: "الرمز الفريد", en: "Unique code" }, { key: "price", ar: "السعر", en: "Price", type: "number" },
    { key: "durationMinutes", ar: "المدة بالدقائق", en: "Duration (minutes)", type: "number" }, { key: "currencyCode", ar: "العملة", en: "Currency" },
  ];
  const methodCard = (method: Method, index: number, list: Method[]) => {
    const Icon = getConsultationIcon(method.iconKey);
    return <article key={method.id} className="rounded-3xl border border-transparent bg-white p-5 shadow-[0_14px_40px_rgba(7,17,31,0.055)] transition hover:border-white focus-within:border-white">
      <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B4232A]/10 text-[#B4232A]"><Icon className="h-5 w-5" /></span><div><h3 className="font-black text-[#082B67]">{isAr ? method.nameAr : method.nameEn}</h3><p className="mt-1 text-xs text-gray-500">{method.code} · {method.price} {method.currencyCode} · {method.durationMinutes} {isAr ? "دقيقة" : "min"}</p></div></div>
        <div className="flex gap-1">{method.isActive ? <><button onClick={() => move(list, index, -1)} aria-label="up"><ArrowUp /></button><button onClick={() => move(list, index, 1)} aria-label="down"><ArrowDown /></button><button onClick={() => edit(method)} aria-label="edit"><Pencil /></button><button onClick={() => archive(method, "archive")} aria-label="archive"><Archive /></button></> : <><button onClick={() => archive(method, "restore")} aria-label="restore"><RotateCcw /></button><button onClick={() => remove(method)} aria-label="delete"><Trash2 /></button></>}</div>
      </div></article>;
  };

  return <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#F3F6FA] p-5 md:p-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black text-[#082B67]">{isAr ? "أنواع الاستشارة والأسعار" : "Consultation Types & Prices"}</h1><p className="mt-2 text-sm text-[#65748B]">{isAr ? "كل دولة لها أنواعها وأسعارها وترتيبها الخاص." : "Each country has its own methods, prices, and order."}</p></div>
      <label className="min-w-64 text-sm font-bold text-[#082B67]">{isAr ? "الدولة" : "Country"}<select value={countryCode} onChange={(event) => selectCountry(event.target.value)} className={inputClass}>{countries.map((country) => <option key={country.code} value={country.code}>{isAr ? country.nameAr : country.nameEn} · {country.currencyCode}</option>)}</select></label></div>
    {message && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{message}</p>}
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
      <form onSubmit={submit} className="rounded-3xl border border-transparent bg-white p-6 shadow-[0_14px_40px_rgba(7,17,31,0.055)] transition hover:border-white">
        <div className="mb-4 flex justify-between"><h2 className="font-black text-[#082B67]">{editing ? (isAr ? "تعديل النوع" : "Edit method") : (isAr ? "إضافة نوع استشارة" : "Add consultation type")}</h2>{editing ? <button type="button" onClick={() => { setEditing(null); setForm(emptyForm(selectedCountry?.currencyCode)); }}><X /></button> : <Plus />}</div>
        <div className="grid gap-4 md:grid-cols-2">{fields.map((field) => <label key={field.key} className="text-sm font-bold text-[#082B67]">{isAr ? field.ar : field.en}<input required disabled={(field.key === "code" && !!editing) || field.key === "currencyCode"} type={field.type ?? "text"} min={field.key === "durationMinutes" ? "1" : field.key === "price" ? "0.001" : undefined} max={field.key === "durationMinutes" ? "1440" : undefined} step={field.key === "price" ? "0.001" : field.type === "number" ? "1" : undefined} className={inputClass} value={form[field.key]} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} /></label>)}
          <ConsultationIconPicker isAr={isAr} value={form.iconKey} onChange={(iconKey) => setForm({ ...form, iconKey })} /></div>
        <button disabled={saving || !countryCode} className="mt-5 rounded-xl bg-[#B4232A] px-6 py-3 font-black text-white disabled:opacity-50">{saving ? <Loader2 className="animate-spin" /> : (isAr ? "حفظ" : "Save")}</button>
      </form>
      <div>{busy ? <Loader2 className="mx-auto mt-12 animate-spin" /> : <><section><h2 className="mb-4 text-xl font-black text-[#082B67]">{isAr ? "الأنواع النشطة" : "Active methods"}</h2><div className="grid gap-4">{active.length ? active.map((method, index) => methodCard(method, index, active)) : <p className="rounded-3xl bg-white p-7 text-center text-sm text-gray-500">{isAr ? "لا توجد أنواع نشطة لهذه الدولة." : "No active methods for this country."}</p>}</div></section><section className="mt-8"><h2 className="mb-4 text-xl font-black text-gray-500">{isAr ? "الأرشيف" : "Archived"}</h2><div className="grid gap-4">{archived.length ? archived.map((method, index) => methodCard(method, index, archived)) : <p className="rounded-3xl bg-white p-7 text-center text-sm text-gray-500">{isAr ? "الأرشيف فارغ." : "Archive is empty."}</p>}</div></section></>}</div>
    </div>
  </div></main>;
}
