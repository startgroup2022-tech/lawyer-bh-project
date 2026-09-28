"use client";

import {useState} from "react";
import {ExternalLink, Loader2, Monitor, Save, Smartphone} from "lucide-react";
import type {ManagedCountry} from "@/lib/countries/catalog";
import type {CountryProduct} from "@/lib/countries/languages";
import {
  buildPlatformPatch,
  getPlatformDisableConfirmation,
  getPlatformStateLabel,
  submitPlatformChange,
  type CountryPatch,
} from "./country-view";

const inputClass = "h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-[#082B67] outline-none focus:border-[#B4232A] focus:ring-4 focus:ring-red-50";

type Props = {country:ManagedCountry;isAr:boolean;onSaved:(code:string,patch:CountryPatch)=>void};

export default function CountryPlatformPanel({country,isAr,onSaved}:Props) {
  const [busy,setBusy] = useState<CountryProduct | "url" | null>(null);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const countryName = isAr ? country.nameAr : country.nameEn;

  async function setPlatform(product:CountryProduct, enabled:boolean) {
    try {
      const result = await submitPlatformChange(product,enabled,()=>window.confirm(getPlatformDisableConfirmation(isAr)),async payload=>{
        setBusy(product); setError(""); setNotice("");
        const response = await fetch(`/api/admin/countries/${country.code}/platforms`, {
          method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      });
      if ("cancelled" in result) return;
      onSaved(country.code,buildPlatformPatch(product,result.platform));
      setNotice(isAr ? "تم تحديث تفعيل قاعدة البيانات" : "Database activation updated");
    } catch {
      setError(isAr ? "تعذر تحديث قاعدة البيانات. حاول مجددًا." : "Could not update database activation. Please retry.");
    } finally { setBusy(null); }
  }

  async function saveUrl(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lawyersPlatformUrl = String(new FormData(event.currentTarget).get("lawyersPlatformUrl") ?? "");
    setBusy("url"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/country-settings", {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({code:country.code,lawyersPlatformUrl}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onSaved(country.code,{lawyersPlatformUrl:data.settings.lawyersPlatformUrl,websiteUrl:data.settings.lawyersPlatformUrl});
      setNotice(isAr ? "تم حفظ رابط منصة محامون" : "Lawyers Platform URL saved");
    } catch {
      setError(isAr ? "أدخل رابط HTTPS صحيحًا ثم حاول مجددًا." : "Enter a valid HTTPS URL and retry.");
    } finally { setBusy(null); }
  }

  const platforms = [
    {product:"lawyers" as const,title:isAr?"منصة محامون":"Lawyers Platform",enabled:country.lawyersPlatformEnabled,Icon:Monitor},
    {product:"legal_sos" as const,title:isAr?"النجدة القانونية":"LegalSOS",enabled:country.legalSosEnabled,Icon:Smartphone},
  ];

  return <section aria-label={isAr?`منصات ${countryName}`:`${countryName} platforms`} className="space-y-3 border-t border-gray-100 pt-4">
    <h3 className="text-sm font-black">{isAr?"قواعد بيانات المنصات":"Platform databases"}</h3>
    {platforms.map(({product,title,enabled,Icon}) => <div key={product} className="rounded-2xl bg-[#F7F8FA] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-black"><Icon className="h-4 w-4 text-[#B4232A]" />{title}</span>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
          <span>{isAr?"تفعيل قاعدة البيانات":"Activate database"}</span>
          <span className="relative inline-flex">
            <input type="checkbox" role="switch" checked={enabled} disabled={busy!==null}
              onChange={event=>void setPlatform(product,event.target.checked)} className="peer sr-only"
              aria-label={`${title} — ${isAr?"تفعيل قاعدة البيانات":"Activate database"}`} />
            <span className={`relative h-6 w-11 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#B4232A] peer-focus-visible:ring-offset-2 ${enabled?"bg-[#B4232A]":"bg-gray-300"}`}>
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${enabled?"start-6":"start-1"}`} />
            </span>
          </span>
        </label>
      </div>
      <p className={`mt-2 text-xs font-bold ${enabled?"text-emerald-700":"text-gray-500"}`}>{getPlatformStateLabel(enabled,isAr)}</p>
      {product === "legal_sos" && <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3 text-xs leading-6 text-gray-600">
        <a href="https://legalsos.org" target="_blank" rel="noreferrer" className="flex items-center gap-1 font-bold text-[#082B67] underline-offset-2 hover:underline"><ExternalLink className="h-3.5 w-3.5" />https://legalsos.org</a>
        <p>{isAr?"تطبيق LegalSOS للهواتف":"LegalSOS mobile application"}</p>
        <p>{isAr?"وجهة ثابتة لجميع الدول وغير قابلة للتعديل.":"Fixed destination for every country and not editable."}</p>
      </div>}
    </div>)}
    <form key={`${country.code}:${country.lawyersPlatformUrl??""}`} onSubmit={saveUrl} className="space-y-2 rounded-2xl border border-gray-200 p-3">
      <label htmlFor={`lawyers-url-${country.code}`} className="block text-xs font-black">{isAr?"رابط منصة محامون":"Lawyers Platform URL"}</label>
      <input id={`lawyers-url-${country.code}`} name="lawyersPlatformUrl" type="url" inputMode="url" dir="ltr" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={2048} defaultValue={country.lawyersPlatformUrl??""} placeholder="https://example.com" disabled={busy!==null} className={inputClass} />
      <p className="text-[11px] text-gray-500">{isAr?"حفظ الرابط لا ينشر المنصة ولا يفعّل قاعدة البيانات.":"Saving the URL does not publish the platform or activate its database."}</p>
      <button type="submit" disabled={busy!==null} className="inline-flex items-center gap-2 rounded-xl bg-[#082B67] px-3 py-2 text-xs font-black text-white disabled:opacity-50">
        {busy==="url"?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Save className="h-3.5 w-3.5"/>}{isAr?"حفظ الرابط":"Save URL"}
      </button>
    </form>
    {error && <p role="alert" className="text-xs font-bold text-red-700">{error}</p>}
    {notice && <p role="status" className="text-xs font-bold text-emerald-700">{notice}</p>}
  </section>;
}
