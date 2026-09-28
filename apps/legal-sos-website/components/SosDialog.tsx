"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { defaultCountries, FlagImage, parseCountry, usePhoneInput } from "react-international-phone";
import type { Dictionary, Locale } from "@/lib/i18n";
import { loadEmergencyCases, type EmergencyCase } from "@/lib/emergency-cases";
import { useSite } from "./providers/SiteProvider";
import SosPaymentDialog from "./SosPaymentDialog";
import styles from "./SosFlow.module.css";

const phoneCountries = defaultCountries.map(parseCountry);

const copy = {
  ar: {
    title: "طلب النجدة", close: "إغلاق", case: "اختر الحالة", details: "بيانات التواصل",
    payment: "مراجعة والدفع", next: "متابعة", back: "رجوع", name: "الاسم الكامل",
    phone: "رقم الهاتف", note: "تفاصيل إضافية (اختياري)", terms: "أوافق على",
    termsLink: "الشروط وسياسة الخصوصية", pay: "الانتقال إلى الدفع الآمن", loading: "جارٍ التجهيز...",
    price: "رسوم الخدمة", noCases: "تعذر تحميل الحالات. أغلق الطلب وحاول مجددًا.",
    error: "تعذر تجهيز الطلب. حاول مجددًا.", paymentError: "تعذر فتح صفحة الدفع الآن. حاول مجددًا دون إنشاء طلب جديد.",
    countrySearch: "ابحث عن الدولة أو رمز الاتصال", summary: "راجع الحالة والبيانات قبل الدفع",
    notice: "لن يبدأ البحث عن محامي إلا بعد تأكيد الدفع.",
  },
  en: {
    title: "Legal SOS request", close: "Close", case: "Choose a case", details: "Contact details",
    payment: "Review and pay", next: "Continue", back: "Back", name: "Full name",
    phone: "Phone number", note: "Additional details (optional)", terms: "I agree to the",
    termsLink: "Privacy Policy and Terms", pay: "Continue to secure payment", loading: "Preparing...",
    price: "Service fee", noCases: "Could not load cases. Close and try again.",
    error: "Could not prepare the request. Please try again.", paymentError: "Could not open the payment page. Retry without creating a new request.",
    countrySearch: "Search country or dialing code", summary: "Review your case and details before payment",
    notice: "Lawyer matching begins only after payment is confirmed.",
  },
  tr: {
    title: "Legal SOS talebi", close: "Kapat", case: "Durum seçin", details: "İletişim bilgileri",
    payment: "İncele ve öde", next: "Devam", back: "Geri", name: "Ad soyad",
    phone: "Telefon numarası", note: "Ek bilgiler (isteğe bağlı)", terms: "Kabul ediyorum:",
    termsLink: "Gizlilik Politikası ve Koşullar", pay: "Güvenli ödemeye geç", loading: "Hazırlanıyor...",
    price: "Hizmet bedeli", noCases: "Durumlar yüklenemedi. Kapatıp tekrar deneyin.",
    error: "Talep hazırlanamadı. Tekrar deneyin.", paymentError: "Ödeme sayfası açılamadı. Yeni talep oluşturmadan tekrar deneyin.",
    countrySearch: "Ülke veya telefon kodu ara", summary: "Ödemeden önce durumu ve bilgileri kontrol edin",
    notice: "Avukat araması yalnızca ödeme onaylandıktan sonra başlar.",
  },
};

export function SosDialog({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const site = useSite();
  const t = copy[locale];
  const [step, setStep] = useState(1);
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState(false);
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const key = useRef("");
  const booking = useRef("");
  const dialog = useRef<HTMLDivElement>(null);
  const selected = cases.find((item) => item.id === category);
  const sitePhoneCountry = phoneCountries.some((item) => item.iso2 === site.country.code.toLowerCase())
    ? site.country.code.toLowerCase() : "bh";
  const { inputValue, country: phoneCountry, setCountry, handlePhoneValueChange, inputRef } = usePhoneInput({
    defaultCountry: sitePhoneCountry,
    value: phone,
    disableDialCodeAndPrefix: true,
    onChange: ({ phone: value }) => setPhone(value),
  });
  const setPhoneCountryRef = useRef(setCountry);
  useEffect(() => {
    setPhoneCountryRef.current = setCountry;
  }, [setCountry]);
  const localDigits = phone.startsWith("+" + phoneCountry.dialCode) ? phone.slice(phoneCountry.dialCode.length + 1) : "";
  const phoneValid = /^\+[1-9]\d{6,14}$/.test(phone) && localDigits.length >= 4;
  const countryNames = new Intl.DisplayNames([locale], { type: "region" });
  const matchingCountries = countryOpen ? phoneCountries.filter((item) => {
    const label = countryNames.of(item.iso2.toUpperCase()) || item.name;
    const query = countrySearch.trim().toLowerCase();
    return !query || label.toLowerCase().includes(query) || item.name.toLowerCase().includes(query) ||
      item.dialCode.includes(query.replace(/^\+/, ""));
  }) : [];

  useEffect(() => {
    if (!site.sosOpen) return;
    setStep(1);
    setName("");
    setPhone("");
    setPhoneCountryRef.current(sitePhoneCountry, { focusOnInput: false });
    setCountryOpen(false);
    setCountrySearch("");
    setDescription(site.sosSeed);
    setTerms(false);
    setError("");
    setBusy(false);
    setPaymentOpen(false);
    setPaymentAmount(0);
    key.current = crypto.randomUUID();
    booking.current = "";
    setCategory(site.sosCaseId);
    window.setTimeout(() => dialog.current?.querySelector<HTMLElement>("button")?.focus(), 20);
  }, [site.sosOpen, site.sosCaseId, site.sosSeed, sitePhoneCountry]);

  useEffect(() => {
    if (!site.sosOpen) return;
    const controller = new AbortController();
    setCases([]);
    setCasesError(false);
    setCasesLoading(true);
    loadEmergencyCases(site.country.code, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setCases(items);
          setCategory((current) => items.some((item) => item.id === current) ? current : "");
        }
      })
      .catch(() => { if (!controller.signal.aborted) setCasesError(true); })
      .finally(() => { if (!controller.signal.aborted) setCasesLoading(false); });
    return () => controller.abort();
  }, [site.sosOpen, site.country.code]);

  if (!site.sosOpen) return null;

  async function checkout() {
    if (busy || !selected || name.trim().length < 2 || !phoneValid || !terms) return;
    setBusy(true);
    setError("");
    try {
      if (!booking.current) {
        const response = await fetch("/api/sos", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept-Language": locale, "X-SOS-Payment-Mode": "card" },
          body: JSON.stringify({
            country: site.country.code, category, name: name.trim(), phone, phoneDialCode: phoneCountry.dialCode,
            description: description.trim(), acceptedTerms: terms, idempotencyKey: key.current,
          }),
        });
        const request = await response.json() as { ok?: boolean; requestId?: string; amount?: number; currency?: string };
        if (!response.ok || !request.ok || !request.requestId ||
            !Number.isFinite(request.amount) || Number(request.amount) <= 0 || request.currency !== "BHD") {
          throw new Error("request");
        }
        booking.current = request.requestId;
        setPaymentAmount(Number(request.amount));
      }
      setPaymentOpen(true);
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.dialog} ref={dialog} role="dialog" aria-modal={!paymentOpen} aria-hidden={paymentOpen} aria-labelledby="sos-flow-title" dir={locale === "ar" ? "rtl" : "ltr"}>
        <button type="button" className={styles.close} onClick={site.closeSos} disabled={busy || paymentOpen} aria-label={t.close}>×</button>
        <div className={styles.brand}>SOS <span>{t.title}</span></div>
        <h2 id="sos-flow-title">{[t.case, t.details, t.payment][step - 1]}</h2>
        <div className={styles.progress} aria-label={String(step) + " / 3"}><span style={{ width: String(step * 100 / 3) + "%" }} /></div>
        <div className={styles.steps}><span>{t.case}</span><span>{t.details}</span><span>{t.payment}</span></div>
        {step === 1 && (
          <div className={styles.cases}>
            {casesLoading && <p role="status">{t.loading}</p>}
            {casesError && <p role="alert" className={styles.error}>{t.noCases}</p>}
            {cases.map((item) => (
              <button type="button" key={item.id} className={category === item.id ? styles.caseActive : styles.case}
                onClick={() => setCategory(item.id)} aria-pressed={category === item.id}>
                <span className={styles.caseName}>{locale === "ar" && item.nameAr ? item.nameAr : item.nameEn}</span>
                <small>{locale === "ar" && item.descriptionAr ? item.descriptionAr : item.descriptionEn}</small>
                <strong>{item.price.toFixed(3)} BHD</strong>
              </button>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className={styles.fields}>
            <label className={styles.field}><span>{t.name}</span><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} /></label>
            <div className={styles.field}>
              <label htmlFor="sos-phone">{t.phone}</label>
              <div className={styles.phoneField}>
                <button type="button" className={styles.phoneCountry} onClick={() => setCountryOpen((open) => !open)} aria-expanded={countryOpen} aria-controls="sos-phone-countries" aria-label={countryNames.of(phoneCountry.iso2.toUpperCase()) || phoneCountry.name}>
                  <FlagImage iso2={phoneCountry.iso2} size="22px" /> <bdi>+{phoneCountry.dialCode}</bdi> <span aria-hidden="true">⌄</span>
                </button>
                <input id="sos-phone" ref={inputRef} type="tel" autoComplete="tel-national" inputMode="tel" dir="ltr" value={inputValue} onChange={handlePhoneValueChange} maxLength={30} />
              </div>
              {countryOpen && <div id="sos-phone-countries" className={styles.phoneMenu}>
                <input autoFocus type="search" value={countrySearch} onChange={(event) => setCountrySearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setCountryOpen(false); }} placeholder={t.countrySearch} aria-label={t.countrySearch} />
                <div className={styles.phoneOptions} role="listbox" aria-label={t.countrySearch}>
                  {matchingCountries.map((item) => <button type="button" role="option" aria-selected={phoneCountry.iso2 === item.iso2} key={item.iso2} onClick={() => { setCountry(item.iso2); setCountryOpen(false); setCountrySearch(""); }}>
                    <FlagImage iso2={item.iso2} size="20px" /><span>{countryNames.of(item.iso2.toUpperCase()) || item.name}</span><bdi>+{item.dialCode}</bdi>
                  </button>)}
                </div>
              </div>}
            </div>
            {description && <label className={styles.field}><span>{t.note}</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} /></label>}
            <label className={styles.check}><input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} />
              <span>{t.terms} <Link href={"/" + locale + "/terms"} target="_blank">{t.termsLink}</Link></span>
            </label>
          </div>
        )}
        {step === 3 && selected && (
          <div className={styles.summary}>
            <p>{t.summary}</p>
            <strong>{locale === "ar" && selected.nameAr ? selected.nameAr : selected.nameEn}</strong>
            <span>{t.name}: {name}</span>
            <span>{t.phone}: <bdi>{phone}</bdi></span>
            <div className={styles.amount}><span>{t.price}</span><strong>{selected.price.toFixed(3)} BHD</strong></div>
            <small>{t.notice}</small>
          </div>
        )}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          {step > 1 && <button type="button" className={styles.secondary} onClick={() => { setStep(step - 1); setError(""); }} disabled={busy || Boolean(booking.current)}>{t.back}</button>}
          {step < 3 ? <button type="button" className={styles.primary}
            disabled={step === 1 ? !selected : name.trim().length < 2 || !phoneValid || !terms}
            onClick={() => setStep(step + 1)}>{t.next}</button> :
            <button id="sos-pay-button" type="button" className={styles.primary} disabled={busy || paymentOpen} onClick={checkout}>{busy ? t.loading : t.pay}</button>}
        </div>
        <p className={styles.disclaimer}>{dictionary.emergencyDisclaimer}</p>
      </div>
      {paymentOpen && booking.current && paymentAmount > 0 && (
        <SosPaymentDialog
          requestId={booking.current}
          amount={paymentAmount}
          locale={locale}
          name={name.trim()}
          phone={phone}
          phoneDialCode={phoneCountry.dialCode}
          onClose={() => {
            setPaymentOpen(false);
            window.setTimeout(() => document.getElementById("sos-pay-button")?.focus(), 20);
          }}
        />
      )}
    </div>
  );
}
