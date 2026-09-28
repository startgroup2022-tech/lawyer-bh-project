"use client";

import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { countryRegistrationProfile, lawyerRegistrationError, validateCountryRegistration, type LawyerRegistrationErrorCode } from "@/lib/lawyer-registration";
import styles from "./LawyerRegistrationFlow.module.css";

type Copy = {
  title: string; intro: string; details: string; documents: string; fullNameAr: string;
  fullNameEn: string; phone: string; email: string; password: string;
  confirmPassword: string; licenseNumber: string; licenseExpiryDate: string;
  ibanNumber: string; experienceYears: string; language: string; profileImage: string;
  lawyerLicense: string; ibanCertificate: string; personalId: string;
  signature: string; clearSignature: string; agreement: string; terms: string;
  continue: string; back: string; submit: string; submitting: string;
  success: string; passwordError: string; matchError: string; signatureError: string;
  fileError: string; genericError: string; yearError: string;
  close: string; loadingAgreement: string; agreementUnavailable: string;
};

type LawyerRegistrationFlowProps = {
  countryCode: string;
  locale: string;
  mode?: "standalone" | "onboarding";
  initialIdentity?: {
    fullName: string;
    email: string;
    professionalIdentifier: string;
  };
  onSubmitted?: (result: { reference: string; countryCode: string }) => void;
};

const copy: Record<string, Copy> = {
  ar: {
    title: "التسجيل كمحامي", intro: "خطوتان فقط لإرسال طلبك، تمامًا كما في التطبيق.",
    details: "البيانات الأساسية", documents: "المستندات والموافقة",
    fullNameAr: "الاسم الكامل بالعربية", fullNameEn: "الاسم الكامل بالإنجليزية",
    phone: "رقم الهاتف", email: "البريد الإلكتروني", password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور", licenseNumber: "رقم رخصة المحاماة",
    licenseExpiryDate: "تاريخ انتهاء الرخصة", ibanNumber: "رقم الآيبان",
    experienceYears: "سنوات الخبرة", language: "لغة التواصل", profileImage: "الصورة الشخصية",
    lawyerLicense: "رخصة المحاماة", ibanCertificate: "شهادة الآيبان",
    personalId: "البطاقة الشخصية", signature: "التوقيع", clearSignature: "مسح التوقيع",
    agreement: "أوافق على اتفاقية حقوق والتزامات المحامي", terms: "عرض اتفاقية المحامي",
    continue: "متابعة إلى المستندات", back: "العودة للبيانات", submit: "إرسال طلب التسجيل",
    submitting: "جارٍ إرسال الطلب...", success: "تم إرسال طلبك للمراجعة بنجاح.",
    passwordError: "كلمة المرور يجب أن تتكون من 8 أحرف على الأقل وتشمل حرفًا كبيرًا وصغيرًا ورقمًا.",
    matchError: "كلمتا المرور غير متطابقتين.", signatureError: "يرجى إضافة توقيعك.",
    fileError: "يجب ألا يتجاوز حجم كل ملف 5 ميغابايت.",
    genericError: "تعذر إرسال الطلب. حاول مرة أخرى.", yearError: "سنوات الخبرة يجب أن تكون بين 0 و80.",
    close: "إغلاق", loadingAgreement: "جارٍ تحميل الاتفاقية...",
    agreementUnavailable: "تعذر تحميل اتفاقية المحامي. لا يمكن إرسال الطلب الآن؛ حاول مجددًا لاحقًا.",
  },
  en: {
    title: "Register as a lawyer", intro: "Send your application in two steps, just like in the app.",
    details: "Your details", documents: "Documents and consent",
    fullNameAr: "Full name in Arabic", fullNameEn: "Full name in English",
    phone: "Phone number", email: "Email address", password: "Password",
    confirmPassword: "Confirm password", licenseNumber: "Lawyer license number",
    licenseExpiryDate: "License expiry date", ibanNumber: "IBAN",
    experienceYears: "Years of experience", language: "Contact language", profileImage: "Profile photo",
    lawyerLicense: "Lawyer license", ibanCertificate: "IBAN certificate",
    personalId: "Personal ID", signature: "Signature", clearSignature: "Clear signature",
    agreement: "I agree to the lawyer rights and obligations agreement", terms: "View lawyer agreement",
    continue: "Continue to documents", back: "Back to details", submit: "Submit registration",
    submitting: "Submitting application...", success: "Your application has been sent for review.",
    passwordError: "Use at least 8 characters with an uppercase letter, a lowercase letter, and a number.",
    matchError: "Passwords do not match.", signatureError: "Please add your signature.",
    fileError: "Each file must be 5 MB or smaller.",
    genericError: "Could not submit your application. Please try again.", yearError: "Experience must be between 0 and 80 years.",
    close: "Close", loadingAgreement: "Loading the agreement...",
    agreementUnavailable: "The lawyer agreement could not be loaded. Registration cannot be submitted right now.",
  },
  tr: {
    title: "Avukat olarak kaydolun", intro: "Başvurunuzu uygulamadaki gibi iki adımda gönderin.",
    details: "Bilgileriniz", documents: "Belgeler ve onay",
    fullNameAr: "Arapça tam ad", fullNameEn: "İngilizce tam ad",
    phone: "Telefon numarası", email: "E-posta", password: "Şifre",
    confirmPassword: "Şifreyi onayla", licenseNumber: "Avukat ruhsat numarası",
    licenseExpiryDate: "Ruhsat bitiş tarihi", ibanNumber: "IBAN",
    experienceYears: "Deneyim yılı", language: "İletişim dili", profileImage: "Profil fotoğrafı",
    lawyerLicense: "Avukat ruhsatı", ibanCertificate: "IBAN belgesi",
    personalId: "Kimlik belgesi", signature: "İmza", clearSignature: "İmzayı temizle",
    agreement: "Avukat hak ve yükümlülükleri sözleşmesini kabul ediyorum", terms: "Avukat sözleşmesini gör",
    continue: "Belgelere devam et", back: "Bilgilere dön", submit: "Başvuruyu gönder",
    submitting: "Başvuru gönderiliyor...", success: "Başvurunuz inceleme için gönderildi.",
    passwordError: "Şifre en az 8 karakter, büyük ve küçük harf ve bir rakam içermelidir.",
    matchError: "Şifreler eşleşmiyor.", signatureError: "Lütfen imzanızı ekleyin.",
    fileError: "Her dosya en fazla 5 MB olmalıdır.",
    genericError: "Başvuru gönderilemedi. Lütfen tekrar deneyin.", yearError: "Deneyim 0 ile 80 yıl arasında olmalıdır.",
    close: "Kapat", loadingAgreement: "Sözleşme yükleniyor...",
    agreementUnavailable: "Avukat sözleşmesi yüklenemedi. Şu anda başvuru gönderilemez.",
  },
};

const maxFileSize = 5 * 1024 * 1024;

export function LawyerRegistrationFlow({
  countryCode,
  locale,
  mode = "standalone",
  initialIdentity,
  onSubmitted,
}: LawyerRegistrationFlowProps) {
  const t = copy[locale] ?? copy.en;
  const countryProfile = countryRegistrationProfile(countryCode);
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState<{ reference: string; countryCode: string } | null>(null);
  const [error, setError] = useState("");
  const [signed, setSigned] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [agreement, setAgreement] = useState<{ id: string; content: string; version: number } | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [agreementError, setAgreementError] = useState("");
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [ibanCertificateFile, setIbanCertificateFile] = useState<File | null>(null);
  const [personalIdFile, setPersonalIdFile] = useState<File | null>(null);
  const [values, setValues] = useState({
    fullNameAr: locale === "ar" ? initialIdentity?.fullName ?? "" : "",
    fullNameEn: locale === "ar" ? "" : initialIdentity?.fullName ?? "",
    phone: countryProfile.dialCode, email: initialIdentity?.email ?? "", password: "",
    confirmPassword: "", licenseNumber: initialIdentity?.professionalIdentifier ?? "", licenseExpiryDate: "",
    ibanNumber: "", experienceYears: "", language: "",
  });
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const previousCountry = useRef(countryCode);

  useEffect(() => {
    if (previousCountry.current === countryCode || busy) return;
    previousCountry.current = countryCode;
    setValues((current) => ({ ...current, phone: countryProfile.dialCode, ibanNumber: countryProfile.ibanPrefix }));
    setStep(1);
    setAgreement(null);
    setAccepted(false);
  }, [busy, countryCode, countryProfile.dialCode, countryProfile.ibanPrefix]);

  useEffect(() => {
    if (step !== 2) return;
    const controller = new AbortController();
    setAgreement(null);
    setAccepted(false);
    setAgreementError("");
    setAgreementLoading(true);
    fetch(`/api/lawyer/agreement?locale=${locale === "ar" ? "ar" : "en"}&countryCode=${countryCode}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        const payload = await response.json();
        if (typeof payload.content !== "string" || !payload.content.trim()) {
          throw new Error("unavailable");
        }
        return { id: String(payload.id), content: payload.content as string, version: Number(payload.version) || 1 };
      })
      .then((published) => { if (!controller.signal.aborted) setAgreement(published); })
      .catch(() => { if (!controller.signal.aborted) setAgreementError(t.agreementUnavailable); })
      .finally(() => { if (!controller.signal.aborted) setAgreementLoading(false); });
    return () => controller.abort();
  }, [step, locale, countryCode, t.agreementUnavailable]);

  function update(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function movePointer(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !canvas.current) return;
    const rect = canvas.current.getBoundingClientRect();
    const context = canvas.current.getContext("2d");
    if (!context) return;
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#d89f39";
    context.lineTo(
      (event.clientX - rect.left) * canvas.current.width / rect.width,
      (event.clientY - rect.top) * canvas.current.height / rect.height,
    );
    context.stroke();
    setSigned(true);
  }

  function startPointer(event: PointerEvent<HTMLCanvasElement>) {
    const element = canvas.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const context = element.getContext("2d");
    if (!context) return;
    element.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(
      (event.clientX - rect.left) * element.width / rect.width,
      (event.clientY - rect.top) * element.height / rect.height,
    );
    drawing.current = true;
  }

  function clearSignature() {
    canvas.current?.getContext("2d")?.clearRect(0, 0, canvas.current.width, canvas.current.height);
    setSigned(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (step === 1) {
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(values.password)) {
        setError(t.passwordError);
        return;
      }
      if (values.password !== values.confirmPassword) {
        setError(t.matchError);
        return;
      }
      if (Number(values.experienceYears) < 0 || Number(values.experienceYears) > 80) {
        setError(t.yearError);
        return;
      }
      const countryError = validateCountryRegistration(countryCode, values.phone, values.ibanNumber);
      if (countryError) {
        setError(lawyerRegistrationError(countryError, locale));
        return;
      }
      if (!profileImage || profileImage.size > maxFileSize) {
        setError(t.fileError);
        return;
      }
      setStep(2);
      return;
    }

    if (!licenseFile || !ibanCertificateFile || !personalIdFile ||
      [licenseFile, ibanCertificateFile, personalIdFile].some((file) => file.size > maxFileSize)) {
      setError(t.fileError);
      return;
    }
    if (!signed || !canvas.current) {
      setError(t.signatureError);
      return;
    }
    if (!accepted || !agreement) {
      setError(t.agreementUnavailable);
      return;
    }
    if (!profileImage) {
      setError(t.fileError);
      return;
    }

    const body = new FormData();
    body.set("countryCode", countryCode);
    body.set("subscriptionType", "lawyer");
    body.set("lang", locale === "ar" ? "ar" : "en");
    for (const [key, value] of Object.entries(values)) body.set(key, value.trim());
    body.set("ibanNumber", values.ibanNumber.replace(/\s+/g, "").toUpperCase());
    body.set("profileImage", profileImage);
    body.set("licenseFile", licenseFile);
    body.set("ibanCertificateFile", ibanCertificateFile);
    body.set("personalIdFile", personalIdFile);
    body.set("signatureDataUrl", canvas.current.toDataURL("image/png"));
    body.set("termsVersionId", agreement.id);

    setBusy(true);
    try {
      const response = await fetch(
        mode === "onboarding"
          ? "/api/lawyer/onboarding/submit"
          : "/api/lawyer/register",
        { method: "POST", body },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = String(payload.code || payload.error || "SERVICE_UNAVAILABLE") as LawyerRegistrationErrorCode;
        const known = ["COUNTRY_UNAVAILABLE","DUPLICATE_EMAIL","DUPLICATE_LICENSE","INVALID_PHONE","INVALID_IBAN","INVALID_DOCUMENT","AGREEMENT_UNAVAILABLE","AGREEMENT_STALE","SERVICE_UNAVAILABLE"].includes(code);
        throw new Error(known ? lawyerRegistrationError(code, locale) : t.genericError);
      }
      const result = { reference: String(payload.reference || payload.id || ""), countryCode: String(payload.countryCode || countryCode) };
      setComplete(result);
      onSubmitted?.(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  if (complete) return <section className={styles.card} role="status"><h2>{t.title}</h2><p>{t.success}</p><strong>{complete.countryCode} · {complete.reference}</strong></section>;

  const textField = (key: keyof typeof values, label: string, type = "text") => {
    const identityLocked =
      mode === "onboarding" &&
      (key === "email" ||
        key === "licenseNumber" ||
        (key === "fullNameAr" && locale === "ar") ||
        (key === "fullNameEn" && locale !== "ar"));

    return (
      <label className={styles.field} key={key}>
        <span>{label}</span>
        <input type={type} value={values[key]} required readOnly={identityLocked} aria-readonly={identityLocked} onChange={(event) => update(key, event.target.value)}
          min={key === "experienceYears" ? 0 : undefined} max={key === "experienceYears" ? 80 : undefined}
          autoComplete={key === "email" ? "email" : key === "phone" ? "tel" : undefined} />
      </label>
    );
  };

  const fileField = (label: string, value: File | null, setter: (file: File | null) => void, accept: string) => (
    <label className={styles.field}>
      <span>{label}</span>
      <input type="file" accept={accept} required={!value} onChange={(event) => setter(event.target.files?.[0] ?? null)} />
      {value && <small>{value.name}</small>}
    </label>
  );

  return (
    <section className={styles.card} dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className={styles.heading}><p>{countryCode}</p><h2>{t.title}</h2><span>{t.intro}</span></div>
      <div className={styles.steps} aria-label={t.title}>
        <span className={step === 1 ? styles.current : ""}>01 · {t.details}</span>
        <span className={step === 2 ? styles.current : ""}>02 · {t.documents}</span>
      </div>
      <form onSubmit={submit} className={styles.form}>
        {step === 1 ? <>
          <div className={styles.grid}>
            {textField("fullNameAr", t.fullNameAr)}
            {textField("fullNameEn", t.fullNameEn)}
            {textField("phone", t.phone, "tel")}
            {textField("email", t.email, "email")}
            {textField("password", t.password, "password")}
            {textField("confirmPassword", t.confirmPassword, "password")}
            {textField("licenseNumber", t.licenseNumber)}
            {textField("licenseExpiryDate", t.licenseExpiryDate, "date")}
            {textField("ibanNumber", t.ibanNumber)}
            {textField("experienceYears", t.experienceYears, "number")}
            <label className={styles.field}><span>{t.language}</span><select required value={values.language} onChange={(event) => update("language", event.target.value)}>
              <option value="">-</option><option value="Arabic">العربية</option><option value="English">English</option>
            </select></label>
            {fileField(t.profileImage, profileImage, setProfileImage, "image/jpeg,image/png,image/webp")}
          </div>
          <button className={styles.primary} type="submit">{t.continue}</button>
        </> : <>
          <div className={styles.grid}>
            {fileField(t.lawyerLicense, licenseFile, setLicenseFile, ".pdf,image/jpeg,image/png")}
            {fileField(t.ibanCertificate, ibanCertificateFile, setIbanCertificateFile, ".pdf,image/jpeg,image/png")}
            {fileField(t.personalId, personalIdFile, setPersonalIdFile, ".pdf,image/jpeg,image/png,image/webp")}
          </div>
          <div className={styles.signatureBox}>
            <div className={styles.signatureTitle}><strong>{t.signature}</strong><button type="button" onClick={clearSignature}>{t.clearSignature}</button></div>
            <canvas ref={canvas} width={900} height={240} aria-label={t.signature}
              onPointerDown={startPointer} onPointerMove={movePointer}
              onPointerUp={() => { drawing.current = false; }}
              onPointerCancel={() => { drawing.current = false; }} />
          </div>
          <div className={styles.agreementArea}>
            {agreementLoading && <p role="status">{t.loadingAgreement}</p>}
            {agreementError && <p className={styles.error} role="alert">{agreementError}</p>}
            {agreement && <>
              <button className={styles.agreementLink} type="button" onClick={() => setAgreementOpen(true)}>{t.terms}</button>
              <label className={styles.agreement}><input type="checkbox" required checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
                <span>{t.agreement}</span>
              </label>
            </>}
          </div>
          <div className={styles.actions}><button className={styles.secondary} type="button" disabled={busy} onClick={() => { setStep(1); setError(""); }}>{t.back}</button>
            <button className={styles.primary} type="submit" disabled={busy}>{busy ? t.submitting : t.submit}</button></div>
        </>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>
      {agreementOpen && agreement && <div className={styles.modalBackdrop} onClick={() => setAgreementOpen(false)}>
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label={t.terms} onClick={(event) => event.stopPropagation()}>
          <div className={styles.modalHeader}><h3>{t.terms}</h3><button type="button" onClick={() => setAgreementOpen(false)}>{t.close}</button></div>
          <p className={styles.agreementContent}>{agreement.content}</p>
        </div>
      </div>}
    </section>
  );
}
