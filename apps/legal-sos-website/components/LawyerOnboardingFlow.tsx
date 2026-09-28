"use client";

import {
  CheckCircle,
  EnvelopeSimple,
  IdentificationCard,
  LockKey,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";

import type { Locale } from "@/lib/i18n";
import { LawyerRegistrationFlow } from "./LawyerRegistrationFlow";
import { useSite } from "./providers/SiteProvider";
import styles from "./LawyerOnboardingFlow.module.css";

export type LawyerOnboardingView =
  | "quick_form"
  | "check_email"
  | "verifying"
  | "profile_incomplete"
  | "complete_profile"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "link_invalid";

type SafeState = {
  id?: string;
  countryCode?: string;
  fullName?: string;
  email?: string;
  professionalIdentifier?: string;
  locale?: Locale;
  status?: LawyerOnboardingView;
};

type Copy = {
  eyebrow: string;
  title: string;
  intro: string;
  fullName: string;
  email: string;
  identifier: string;
  country: string;
  start: string;
  sending: string;
  checkEmail: string;
  checkEmailBody: string;
  locked: string;
  lockedBody: string;
  complete: string;
  pending: string;
  pendingBody: string;
  invalid: string;
  resend: string;
  genericError: string;
  steps: [string, string, string, string];
};

const translations: Record<Locale, Copy> = {
  ar: {
    eyebrow: "انضم إلى شبكة LegalSOS",
    title: "ابدأ تسجيلك كمحامي",
    intro: "ثلاث بيانات فقط لفتح طلب التسجيل. لن يتفعّل الحساب إلا بعد إكمال الملف وموافقة الإدارة.",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    identifier: "الرقم الشخصي / رقم رخصة المحامي",
    country: "دولة التسجيل",
    start: "ابدأ التسجيل",
    sending: "جارٍ إنشاء الطلب...",
    checkEmail: "تحقق من بريدك الإلكتروني",
    checkEmailBody: "أرسلنا رابطًا آمنًا لاستكمال ملفك. الرابط صالح لمدة 30 دقيقة.",
    locked: "الحساب غير مفعّل",
    lockedBody: "تم التحقق من بريدك. أكمل بياناتك ومستنداتك لإرسال الطلب إلى الإدارة.",
    complete: "أكمل بياناتك للتفعيل",
    pending: "طلبك بانتظار الموافقة",
    pendingBody: "اكتملت بياناتك بنجاح. سيبقى الحساب مقفلًا حتى تراجع الإدارة الطلب وتوافق عليه.",
    invalid: "الرابط غير صالح أو منتهي",
    resend: "إرسال رابط جديد",
    genericError: "تعذر إكمال العملية. حاول مرة أخرى.",
    steps: ["تحقق البريد", "إكمال البيانات", "مراجعة الطلب", "تفعيل الحساب"],
  },
  en: {
    eyebrow: "Join the LegalSOS network",
    title: "Start your lawyer registration",
    intro: "Begin with only three details. Your account activates only after profile completion and admin approval.",
    fullName: "Full name",
    email: "Email address",
    identifier: "Personal number / lawyer license number",
    country: "Registration country",
    start: "Start registration",
    sending: "Creating request...",
    checkEmail: "Check your email",
    checkEmailBody: "We sent a secure link to continue your profile. The link is valid for 30 minutes.",
    locked: "Account not activated",
    lockedBody: "Your email is verified. Complete your information and documents to submit for review.",
    complete: "Complete your information",
    pending: "Your application is awaiting approval",
    pendingBody: "Your profile is complete. The account stays locked until an administrator approves it.",
    invalid: "This link is invalid or expired",
    resend: "Send a new link",
    genericError: "We could not complete this action. Please try again.",
    steps: ["Verify email", "Complete profile", "Application review", "Account activation"],
  },
  tr: {
    eyebrow: "LegalSOS ağına katılın",
    title: "Avukat kaydınızı başlatın",
    intro: "Yalnızca üç bilgiyle başlayın. Hesap, profil tamamlanıp yönetici onayından sonra etkinleşir.",
    fullName: "Ad soyad",
    email: "E-posta adresi",
    identifier: "Kimlik / avukat ruhsat numarası",
    country: "Kayıt ülkesi",
    start: "Kaydı başlat",
    sending: "Talep oluşturuluyor...",
    checkEmail: "E-postanızı kontrol edin",
    checkEmailBody: "Profilinize devam etmek için güvenli bir bağlantı gönderdik. Bağlantı 30 dakika geçerlidir.",
    locked: "Hesap etkin değil",
    lockedBody: "E-postanız doğrulandı. İncelemeye göndermek için bilgilerinizi ve belgelerinizi tamamlayın.",
    complete: "Bilgilerinizi tamamlayın",
    pending: "Başvurunuz onay bekliyor",
    pendingBody: "Profiliniz tamamlandı. Yönetici onaylayana kadar hesap kilitli kalır.",
    invalid: "Bağlantı geçersiz veya süresi dolmuş",
    resend: "Yeni bağlantı gönder",
    genericError: "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
    steps: ["E-postayı doğrula", "Profili tamamla", "Başvuru incelemesi", "Hesap aktivasyonu"],
  },
};

export function LawyerOnboardingFlow({
  locale,
  verificationToken = "",
  initialPreviewState,
}: {
  locale: Locale;
  verificationToken?: string;
  initialPreviewState?: "profile_incomplete" | "pending_approval";
}) {
  const site = useSite();
  const copy = translations[locale];
  const [view, setView] = useState<LawyerOnboardingView>(
    initialPreviewState ?? (verificationToken ? "verifying" : "quick_form"),
  );
  const [state, setState] = useState<SafeState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState({
    fullName: "",
    email: "",
    professionalIdentifier: "",
  });

  useEffect(() => {
    if (initialPreviewState) setView(initialPreviewState);
  }, [initialPreviewState]);

  useEffect(() => {
    if (initialPreviewState) return;
    const controller = new AbortController();

    async function load() {
      if (verificationToken) {
        const response = await fetch("/api/lawyer/onboarding/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: verificationToken }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        window.history.replaceState({}, "", window.location.pathname);
        if (!response.ok || !payload.state) {
          setView("link_invalid");
          return;
        }
        setState(payload.state);
        setView("profile_incomplete");
        return;
      }

      const response = await fetch("/api/lawyer/onboarding/status", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) return;
      const payload = await response.json().catch(() => ({}));
      if (payload.state?.status === "profile_incomplete") {
        setState(payload.state);
        setView("profile_incomplete");
      }
    }

    load().catch(() => undefined);
    return () => controller.abort();
  }, [initialPreviewState, verificationToken]);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/lawyer/onboarding/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: site.country.code,
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          professionalIdentifier: values.professionalIdentifier.trim(),
          locale,
        }),
      });
      if (!response.ok) throw new Error("start_failed");
      setView("check_email");
    } catch {
      setError(copy.genericError);
    } finally {
      setBusy(false);
    }
  }

  const activeStep =
    view === "quick_form" || view === "check_email" || view === "verifying"
      ? 0
      : view === "profile_incomplete" || view === "complete_profile"
        ? 1
        : view === "pending_approval"
          ? 2
          : 3;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.intro}>
          <span>{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
          <div className={styles.trustCard}>
            <ShieldCheck size={28} weight="duotone" />
            <strong>{site.country.names[locale]}</strong>
            <small>{copy.country} · {site.country.code}</small>
          </div>
        </div>

        <div className={styles.card}>
          <ol className={styles.progress}>
            {copy.steps.map((step, index) => (
              <li key={step} data-active={index <= activeStep}>
                <span>{index < activeStep ? <CheckCircle size={18} weight="fill" /> : index + 1}</span>
                <small>{step}</small>
              </li>
            ))}
          </ol>

          {view === "quick_form" ? (
            <form className={styles.form} onSubmit={start}>
              <label>
                <span>{copy.fullName}</span>
                <input required autoComplete="name" value={values.fullName} onChange={(event) => setValues((current) => ({ ...current, fullName: event.target.value }))} />
              </label>
              <label>
                <span>{copy.email}</span>
                <input required type="email" autoComplete="email" value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label>
                <span>{copy.identifier}</span>
                <input required inputMode="numeric" autoComplete="off" value={values.professionalIdentifier} onChange={(event) => setValues((current) => ({ ...current, professionalIdentifier: event.target.value }))} />
              </label>
              {error ? <p className={styles.error} role="alert">{error}</p> : null}
              <button className={styles.primary} disabled={busy} type="submit">
                <IdentificationCard size={22} />{busy ? copy.sending : copy.start}
              </button>
            </form>
          ) : null}

          {view === "verifying" ? <Status icon={<ShieldCheck size={42} />} title={copy.sending} body="" /> : null}
          {view === "check_email" ? <Status icon={<EnvelopeSimple size={42} />} title={copy.checkEmail} body={copy.checkEmailBody} /> : null}
          {view === "profile_incomplete" ? (
            <Status icon={<LockKey size={42} />} title={copy.locked} body={copy.lockedBody}>
              <button className={styles.primary} type="button" onClick={() => setView("complete_profile")}>{copy.complete}</button>
            </Status>
          ) : null}
          {view === "complete_profile" && state?.fullName && state.email && state.professionalIdentifier ? (
            <div className={styles.formSlot}>
              <LawyerRegistrationFlow
                countryCode={state.countryCode || site.country.code}
                locale={locale}
                mode="onboarding"
                initialIdentity={{
                  fullName: state.fullName,
                  email: state.email,
                  professionalIdentifier: state.professionalIdentifier,
                }}
                onSubmitted={() => setView("pending_approval")}
              />
            </div>
          ) : null}
          {view === "pending_approval" ? <Status icon={<ShieldCheck size={42} />} title={copy.pending} body={copy.pendingBody} /> : null}
          {view === "link_invalid" ? <Status icon={<LockKey size={42} />} title={copy.invalid} body={copy.checkEmailBody}><button className={styles.secondary} type="button" onClick={() => setView("quick_form")}>{copy.resend}</button></Status> : null}
        </div>
      </section>
    </main>
  );
}

function Status({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.status}>
      <div className={styles.statusIcon}>{icon}</div>
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
      {children}
    </div>
  );
}
