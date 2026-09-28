"use client";

import { Siren } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";
import { loadEmergencyCases, type EmergencyCase } from "@/lib/emergency-cases";
import { useSite } from "./providers/SiteProvider";

const messages = {
  ar: { loading: "جارٍ تحميل الحالات الطارئة...", error: "تعذر تحميل الحالات الطارئة.", empty: "لا توجد حالات طارئة للعرض حاليًا.", location: "اختر موقعك من القائمة العلوية لعرض الحالات.", retry: "إعادة المحاولة" },
  en: { loading: "Loading emergency cases...", error: "Emergency cases could not be loaded.", empty: "There are no emergency cases to show right now.", location: "Choose your location above to see emergency cases.", retry: "Try again" },
  tr: { loading: "Acil durumlar yükleniyor...", error: "Acil durumlar yüklenemedi.", empty: "Şu anda gösterilecek acil durum yok.", location: "Acil durumları görmek için yukarıdan konumunuzu seçin.", retry: "Tekrar dene" },
};

export function EmergencyCasesSection({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const site = useSite();
  const [result, setResult] = useState<{ countryCode: string; retry: number; cases: EmergencyCase[]; error: boolean } | null>(null);
  const [selection, setSelection] = useState<{ countryCode: string; id: string }>({ countryCode: "", id: "" });
  const [retry, setRetry] = useState(0);
  const t = messages[locale];
  const countryCode = site.country.code;
  const currentResult = result?.countryCode === countryCode && result.retry === retry ? result : null;
  const cases = currentResult?.cases ?? [];
  const loading = /^[A-Z]{2}$/.test(countryCode) && !currentResult;
  const error = currentResult?.error ?? false;
  const selectedId = selection.countryCode === countryCode ? selection.id : "";

  useEffect(() => {
    if (!/^[A-Z]{2}$/.test(countryCode)) return;
    const controller = new AbortController();
    loadEmergencyCases(countryCode, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setResult({ countryCode, retry, cases: items.filter((item) => (item.workflowType || "emergency_dispatch") === "emergency_dispatch"), error: false });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ countryCode, retry, cases: [], error: true });
        }
      });
    return () => controller.abort();
  }, [countryCode, retry]);

  return <section className="section-block emergency-section">
    <div className="container">
      <div className="section-heading emergency-heading"><h2>{dictionary.servicesTitle}</h2><p>{dictionary.servicesSubtitle}</p></div>
      {loading ? <p className="emergency-state" role="status">{t.loading}</p> :
        !/^[A-Z]{2}$/.test(site.country.code) ? <p className="emergency-state">{t.location}</p> :
        error ? <div className="emergency-state" role="alert"><p>{t.error}</p><button type="button" onClick={() => setRetry((current) => current + 1)}>{t.retry}</button></div> :
        cases.length === 0 ? <p className="emergency-state">{t.empty}</p> : <>
          <div className="emergency-grid">
            {cases.map((item, index) => {
              const selected = selectedId === item.id;
              const name = locale === "ar" && item.nameAr.trim() ? item.nameAr : item.nameEn;
              const description = locale === "ar" && item.descriptionAr?.trim() ? item.descriptionAr : item.descriptionEn;
              return <button type="button" className={`emergency-card${selected ? " emergency-card-selected" : ""}`}
                key={item.id} aria-pressed={selected} onClick={() => setSelection({ countryCode, id: selected ? "" : item.id })}>
                <span className="emergency-card-top"><span className="emergency-card-icon"><Siren size={25} weight="duotone" /></span><span className="emergency-card-number">{String(index + 1).padStart(2, "0")}</span></span>
                <strong>{name}</strong>
                {description && <span className="emergency-card-description">{description}</span>}
              </button>;
            })}
          </div>
          <div className="emergency-actions"><button type="button" className="sos-primary" onClick={() => site.openSos("", selectedId)}><Siren size={21} weight="fill" />SOS</button></div>
        </>}
    </div>
  </section>;
}
