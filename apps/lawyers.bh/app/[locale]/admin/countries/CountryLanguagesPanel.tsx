"use client";

import {useState} from "react";
import {Languages, Loader2, Save} from "lucide-react";
import type {ManagedCountry} from "@/lib/countries/catalog";
import type {CountryLanguageSelection,PlatformLanguage} from "@/lib/countries/languages";
import {buildCountryLanguagePatch,validateCountryLanguages,type CountryPatch} from "./country-view";

const inputClass = "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-[#082B67] outline-none focus:border-[#B4232A] focus:ring-4 focus:ring-red-50";

type Props = {country:ManagedCountry;languages:PlatformLanguage[];isAr:boolean;onSaved:(code:string,patch:CountryPatch)=>void};

export default function CountryLanguagesPanel({country,languages,isAr,onSaved}:Props) {
  const published = languages.filter(language=>language.status==="published");
  const initialEnabled = country.languages?.filter(code=>published.some(language=>language.code===code)) ?? [];
  const [enabledLanguages,setEnabledLanguages] = useState<string[]>(initialEnabled);
  const [defaultLanguage,setDefaultLanguage] = useState(country.defaultLocale);
  const [translations,setTranslations] = useState<Record<string,string>>(country.translations??{});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const countryName = isAr?country.nameAr:country.nameEn;

  function toggle(code:string,checked:boolean) {
    setError(""); setNotice("");
    if (!checked && code===defaultLanguage) {
      setError(isAr?"اختر لغة افتراضية أخرى قبل تعطيل اللغة الحالية.":"Choose another default language before disabling the current one.");
      return;
    }
    setEnabledLanguages(current=>checked?[...current,code]:current.filter(item=>item!==code));
  }

  async function save() {
    const selection:CountryLanguageSelection = {enabledLanguages,defaultLanguage,translations};
    const validation = validateCountryLanguages(selection);
    if (!validation.ok) {
      if (validation.reason==="NO_LANGUAGES") setError(isAr?"فعّل لغة واحدة على الأقل.":"Enable at least one language.");
      else if (validation.reason==="DEFAULT_NOT_ENABLED") setError(isAr?"يجب أن تكون اللغة الافتراضية مفعّلة.":"The default language must be enabled.");
      else setError(isAr?`أدخل اسم الدولة بلغة ${validation.language}.`:`Enter the country name in ${validation.language}.`);
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/countries/${country.code}/languages`, {
        method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(selection),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onSaved(country.code,buildCountryLanguagePatch(data.country));
      setNotice(isAr?"تم حفظ لغات الدولة":"Country languages saved");
    } catch {
      setError(isAr?"تعذر حفظ اللغات. تحقق من البيانات وحاول مجددًا.":"Could not save languages. Check the values and retry.");
    } finally { setBusy(false); }
  }

  return <section aria-label={isAr?`لغات ${countryName}`:`${countryName} languages`} className="space-y-3 border-t border-gray-100 pt-4">
    <h3 className="flex items-center gap-2 text-sm font-black"><Languages className="h-4 w-4 text-[#B4232A]"/>{isAr?"لغات الدولة":"Country languages"}</h3>
    <div className="space-y-2">{published.map(language=>{
      const enabled=enabledLanguages.includes(language.code);
      return <div key={language.code} className="rounded-xl bg-[#F7F8FA] p-3">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-bold">
          <span><bdi>{language.nativeName}</bdi> <span className="text-xs text-gray-400">({language.code})</span></span>
          <input type="checkbox" checked={enabled} disabled={busy} onChange={event=>toggle(language.code,event.target.checked)}
            aria-label={`${isAr?"تفعيل":"Enable"} ${language.nativeName}`} className="h-5 w-5 accent-[#B4232A]" />
        </label>
        {enabled && <label className="mt-2 block text-xs font-bold">
          <span>{isAr?"اسم الدولة بهذه اللغة":"Country name in this language"}</span>
          <input value={translations[language.code]??""} dir={language.direction} disabled={busy} maxLength={200}
            onChange={event=>setTranslations(current=>({...current,[language.code]:event.target.value}))}
            aria-label={`${isAr?"اسم الدولة":"Country name"} — ${language.nativeName}`} className={`${inputClass} mt-1`} />
        </label>}
      </div>;
    })}</div>
    <label className="block text-xs font-black" htmlFor={`default-language-${country.code}`}>{isAr?"اللغة الافتراضية":"Default language"}</label>
    <select id={`default-language-${country.code}`} name="defaultLanguage" value={defaultLanguage} disabled={busy||!enabledLanguages.length}
      onChange={event=>setDefaultLanguage(event.target.value)} aria-label={isAr?`اللغة الافتراضية لل${countryName.replace(/^ال/,"")}`:`Default language for ${countryName}`} className={inputClass}>
      {enabledLanguages.map(code=><option key={code} value={code}>{published.find(language=>language.code===code)?.nativeName??code}</option>)}
    </select>
    <button type="button" onClick={()=>void save()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#B4232A] px-3 py-2 text-xs font-black text-white disabled:opacity-50">
      {busy?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Save className="h-3.5 w-3.5"/>}{isAr?"حفظ اللغات":"Save languages"}
    </button>
    {error && <p role="alert" className="text-xs font-bold text-red-700">{error}</p>}
    {notice && <p role="status" className="text-xs font-bold text-emerald-700">{notice}</p>}
  </section>;
}
