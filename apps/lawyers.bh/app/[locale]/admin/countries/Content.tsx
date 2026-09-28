"use client";

import {useCallback,useEffect,useState} from "react";
import Image from "next/image";
import {AlertCircle,CheckCircle2,Database,Globe2,Loader2,Search,Upload} from "lucide-react";
import type {ManagedCountry} from "@/lib/countries/catalog";
import type {PlatformLanguage} from "@/lib/countries/languages";
import AdminPagination from "../_components/AdminPagination";
import {paginateItems} from "../_components/pagination";
import CountryLanguagesPanel from "./CountryLanguagesPanel";
import CountryPlatformPanel from "./CountryPlatformPanel";
import {applyCountryPatch,getCountryReadinessLabel,summarizeCountries,type CountryPatch} from "./country-view";

const inputClass="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-[#082B67] outline-none transition placeholder:text-gray-400 focus:border-[#B4232A] focus:ring-4 focus:ring-red-50";

type ProvisionValues = { phoneCode: string; currencyCode: string; defaultLocale: string };

export function CountryDatabaseControl({country,isAr,isSaving,onProvision}:{
  country:ManagedCountry;
  isAr:boolean;
  isSaving:boolean;
  onProvision:(values:ProvisionValues)=>void;
}) {
  if(country.tablesProvisioned) {
    return <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm font-extrabold text-emerald-700"><CheckCircle2 className="h-4 w-4"/>{isAr?"قاعدة البيانات مفعّلة":"Database provisioned"}</div>;
  }

  return <form className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3" onSubmit={event=>{
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    onProvision({
      phoneCode:String(form.get("phoneCode")??""),
      currencyCode:String(form.get("currencyCode")??""),
      defaultLocale:String(form.get("defaultLocale")??"ar"),
    });
  }}>
    <p className="flex items-center gap-2 text-sm font-extrabold text-amber-900"><Database className="h-4 w-4"/>{isAr?"تجهيز قاعدة بيانات الدولة":"Provision country database"}</p>
    <div className="grid grid-cols-2 gap-2">
      <input name="phoneCode" dir="ltr" required pattern="\+[1-9][0-9]{0,6}" defaultValue={country.phoneCode??""} placeholder={isAr?"رمز الاتصال +966":"Calling code +966"} disabled={isSaving} className={inputClass}/>
      <input name="currencyCode" dir="ltr" required pattern="[A-Za-z]{3}" maxLength={3} defaultValue={country.currencyCode??""} placeholder={isAr?"العملة SAR":"Currency SAR"} disabled={isSaving} className={inputClass}/>
    </div>
    <select name="defaultLocale" defaultValue={country.defaultLocale||"ar"} disabled={isSaving} className={inputClass}>
      <option value="ar">العربية</option><option value="en">English</option><option value="tr">Türkçe</option>
    </select>
    <button type="submit" disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><Database className="h-4 w-4"/>{isAr?"إنشاء جداول الدولة":"Create country tables"}</button>
    <p className="text-[11px] leading-5 text-amber-800">{isAr?"إنشاء الجداول لا يفعّل منصة محامون أو النجدة القانونية تلقائيًا.":"Creating tables does not enable the Lawyers Platform or LegalSOS automatically."}</p>
  </form>;
}

export default function Content({isAr}:{isAr:boolean}) {
  const [countries,setCountries]=useState<ManagedCountry[]>([]);
  const [languages,setLanguages]=useState<PlatformLanguage[]>([]);
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try {
      const [countriesResponse,languagesResponse]=await Promise.all([
        fetch("/api/admin/country-settings",{cache:"no-store"}),
        fetch("/api/admin/languages",{cache:"no-store"}),
      ]);
      const [countriesData,languagesData]=await Promise.all([countriesResponse.json(),languagesResponse.json()]);
      if(!countriesResponse.ok||!languagesResponse.ok) throw new Error();
      setCountries(countriesData.countries);setLanguages(languagesData.languages);
    } catch {
      setError(isAr?"تعذر تحميل الدول واللغات. تحقق من الاتصال وتحديث قاعدة البيانات.":"Could not load countries and languages. Check the connection and database migration.");
    } finally {setLoading(false);}
  },[isAr]);

  useEffect(()=>{void load();},[load]);

  function updateCountry(code:string,patch:CountryPatch) {
    setCountries(all=>applyCountryPatch(all,code,patch));
  }

  async function upload(country:ManagedCountry,file:File) {
    setBusy(country.code);setError("");setNotice("");
    try {
      if(file.size>4*1024*1024) throw new Error(isAr?"الحد الأقصى للصورة 4 ميغابايت":"Maximum image size is 4 MB");
      const form=new FormData();form.set("code",country.code);form.set("background",file);
      const response=await fetch("/api/admin/country-settings/background",{method:"POST",body:form});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error);
      updateCountry(country.code,{backgroundUrl:data.backgroundUrl});
      setNotice(isAr?"تم حفظ الخلفية":"Background saved");
    } catch(caught) {
      setError(caught instanceof Error?caught.message:(isAr?"تعذر رفع الخلفية":"Background upload failed"));
    } finally {setBusy(null);}
  }

  async function provision(country:ManagedCountry,values:ProvisionValues) {
    const confirmed=window.confirm(isAr?`سيتم إنشاء جداول ${country.nameAr}. هل تريد المتابعة؟`:`Database tables for ${country.nameEn} will be created. Continue?`);
    if(!confirmed) return;
    setBusy(country.code);setError("");setNotice("");
    try {
      const response=await fetch("/api/admin/country-settings/provision",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:country.code,...values})});
      const data=await response.json();
      if(!response.ok||!data.ok) throw new Error(data.error);
      await load();
      setNotice(isAr?"تم إنشاء جداول الدولة":"Country tables created");
    } catch(caught) {
      setError(caught instanceof Error&&caught.message?caught.message:(isAr?"تعذر إنشاء جداول الدولة.":"Could not create country tables."));
    } finally {setBusy(null);}
  }

  const normalized=query.trim().toLowerCase();
  const filtered=countries.filter(country=>`${country.nameAr} ${country.nameEn} ${country.code} ${Object.values(country.translations??{}).join(" ")}`.toLowerCase().includes(normalized));
  const pagination=paginateItems(filtered,page);
  const summary=summarizeCountries(countries);
  const summaryItems=[
    [summary.total,isAr?"إجمالي الدول":"Countries"],
    [summary.lawyersEnabled,isAr?"منصة محامون":"Lawyers Platform"],
    [summary.legalSosEnabled,isAr?"النجدة القانونية":"LegalSOS"],
    [summary.tablesReady,isAr?"جداول جاهزة":"Tables ready"],
  ];

  return <main dir={isAr?"rtl":"ltr"} className="min-h-screen bg-[#F7F8FA] px-4 pb-10 pt-4 text-[#082B67] sm:px-5"><div className="mx-auto max-w-7xl">
    <section className="mb-6 overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#B4232A_0%,#8E1820_100%)] p-7 text-white shadow-[0_22px_60px_rgba(180,35,42,0.24)]">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12"><Globe2/></div><h1 className="text-2xl font-black sm:text-3xl">{isAr?"إدارة الدول":"Country Management"}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-white/75">{isAr?"إدارة لغات كل دولة وتفعيل قواعد بيانات منصة محامون والنجدة القانونية بشكل مستقل.":"Manage country languages and independently activate the Lawyers Platform and LegalSOS databases."}</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{summaryItems.map(([value,label])=><div key={String(label)} className="min-w-24 rounded-2xl bg-white/10 px-3 py-2.5 text-center"><p className="text-2xl font-black">{value}</p><p className="text-[10px] font-bold text-white/70">{label}</p></div>)}</div></div>
    </section>

    <section className="mb-5 rounded-2xl border border-transparent bg-white p-3 shadow-sm transition hover:border-[#B4232A] focus-within:border-[#B4232A]"><label className="relative block"><Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"/><input aria-label={isAr?"البحث عن دولة":"Search countries"} placeholder={isAr?"ابحث بالاسم أو رمز الدولة":"Search name or country code"} value={query} onChange={event=>{setQuery(event.target.value);setPage(1);}} className={`${inputClass} ps-11`}/></label></section>
    {error&&<div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4"/>{error}</span><button onClick={()=>void load()} disabled={!!busy} className="rounded-lg bg-white px-3 py-1.5 shadow-sm">{isAr?"إعادة التحميل":"Reload"}</button></div>}
    {notice&&<div role="status" className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4"/>{notice}</div>}

    {loading?<div role="status" className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm font-bold text-gray-500"><Loader2 className="h-8 w-8 animate-spin text-[#B4232A]"/>{isAr?"جاري تحميل الدول…":"Loading countries…"}</div>:<>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{pagination.items.map(country=>{
        const isSaving=busy===country.code;
        return <article key={country.code} className="overflow-hidden rounded-3xl border border-transparent bg-white shadow-[0_14px_40px_rgba(7,17,31,0.055)] transition hover:border-[#B4232A] focus-within:border-[#B4232A]">
          <div className="relative h-40 bg-[#EEF2F7]">{country.backgroundUrl?<Image src={country.backgroundUrl} alt="" fill unoptimized className="object-cover"/>:<div className="flex h-full flex-col items-center justify-center gap-2 text-[#8B98AA]"><Globe2 className="h-9 w-9"/><span className="text-xs font-bold">{isAr?"لا توجد خلفية":"No background"}</span></div>}{isSaving&&<div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-sm"><Loader2 className="h-7 w-7 animate-spin text-[#B4232A]"/></div>}</div>
          <div className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black">{isAr?country.nameAr:country.nameEn}</h2><p className="mt-1 text-xs text-gray-500">{isAr?country.nameEn:country.nameAr}</p></div><div className="flex gap-1.5"><span className="rounded-lg bg-[#082B67] px-2.5 py-1 text-[10px] font-black text-white">{country.code}</span>{country.currencyCode&&<span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-600">{country.currencyCode}</span>}</div></div>
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${country.tablesProvisioned?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}><Database className="h-4 w-4"/>{getCountryReadinessLabel(country,isAr)}</div>
            <CountryDatabaseControl country={country} isAr={isAr} isSaving={isSaving} onProvision={values=>void provision(country,values)}/>
            <CountryPlatformPanel country={country} isAr={isAr} onSaved={updateCountry}/>
            <CountryLanguagesPanel key={`${country.code}:${country.languages?.join(",")}:${country.defaultLocale}`} country={country} languages={languages} isAr={isAr} onSaved={updateCountry}/>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-center text-xs font-bold text-[#53657D] transition hover:border-[#B4232A] hover:text-[#B4232A]"><Upload className="h-4 w-4"/>{isAr?"رفع خلفية PNG / JPG / WebP — حتى 4 MB":"Upload PNG / JPG / WebP — up to 4 MB"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={isSaving} className="hidden" onChange={event=>{const file=event.target.files?.[0];if(file) void upload(country,file);event.target.value="";}}/></label>
          </div>
        </article>;
      })}</div>
      <AdminPagination isAr={isAr} currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage}/>
    </>}
    {!loading&&!filtered.length&&!error&&<div className="rounded-3xl border border-transparent bg-white py-16 text-center text-sm font-bold text-gray-400"><Globe2 className="mx-auto mb-3 h-9 w-9"/>{isAr?"لا توجد دول مطابقة للبحث":"No countries match your search"}</div>}
  </div></main>;
}
