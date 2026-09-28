"use client";

import { Briefcase, FileText, ShieldCheck } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";

type LawyerField =
  | "fullNameAr"
  | "fullNameEn"
  | "phone"
  | "email"
  | "password"
  | "confirmPassword"
  | "licenseNumber"
  | "licenseExpiryDate"
  | "ibanNumber"
  | "language"
  | "specialtyMain"
  | "registrationLevel"
  | "experienceYears";

type LawyerForm = Record<LawyerField, string> & {
  specialtySubs: string;
  workingHours: string;
};

type LawyerOnboardingResult = {
  success: boolean;
  ok?: boolean;
  error?: string;
  status?: string;
  nextStep?: string;
  id?: string;
  countryCode?: string;
  token?: string;
};

const WORKING_HOURS_OPTIONS = [
  "09:00-13:00",
  "13:00-17:00",
  "09:00-17:00",
];

const SPECIALTIES = [
  "administrative",
  "civil",
  "commercial",
  "labor",
  "criminal",
  "sharia",
  "constitutional",
  "cassation",
  "sports",
];

const REGISTRATION_LEVELS = ["Junior", "Associate", "Senior", "Partner"] as const;

const LANG_OPTIONS = ["Arabic", "English", "Both"];

function normalizeLocale(locale: Locale): "ar" | "en" | "tr" {
  if (locale === "ar") return "ar";
  if (locale === "tr") return "tr";
  return "en";
}

export function LawyerOnboardingCard({
  countryCode,
  dictionary,
  locale,
}: {
  countryCode: string;
  dictionary: Dictionary;
  locale: Locale;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "success">("idle");
  const [message, setMessage] = useState("");
  const [lawyerToken, setLawyerToken] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [result, setResult] = useState<LawyerOnboardingResult | null>(null);

  const [form, setForm] = useState<LawyerForm>({
    fullNameAr: "",
    fullNameEn: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    licenseNumber: "",
    registrationLevel: REGISTRATION_LEVELS[1],
    licenseExpiryDate: "",
    ibanNumber: "",
    experienceYears: "0",
    language: LANG_OPTIONS[0],
    specialtyMain: SPECIALTIES[1],
    specialtySubs: "",
    workingHours: WORKING_HOURS_OPTIONS[2],
  });

  function setField<K extends keyof LawyerForm>(key: K, value: LawyerForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function clear() {
    setStatus("idle");
    setMessage("");
    setResult(null);
    setLawyerToken("");
  }

  function sanitizeIban(value: string) {
    return value.replace(/\s+/g, "").toUpperCase();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!profileImage) {
      setStatus("error");
      setMessage(dictionary.portal.lawyer.profileImageRequired);
      return;
    }

    if (form.password.length < 8) {
      setStatus("error");
      setMessage(dictionary.portal.lawyer.passwordRule);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setStatus("error");
      setMessage(dictionary.portal.lawyer.passwordMismatch);
      return;
    }

    const payload = new FormData();
    payload.set("countryCode", countryCode);
    payload.set("fullNameAr", form.fullNameAr.trim());
    payload.set("fullNameEn", form.fullNameEn.trim());
    payload.set("phone", form.phone.trim());
    payload.set("email", form.email.trim().toLowerCase());
    payload.set("password", form.password);
    payload.set("confirmPassword", form.confirmPassword);
    payload.set("licenseNumber", form.licenseNumber.trim());
    payload.set("registrationLevel", form.registrationLevel);
    payload.set("licenseExpiryDate", form.licenseExpiryDate);
    payload.set("ibanNumber", sanitizeIban(form.ibanNumber));
    payload.set("language", form.language);
    payload.set("workingHours", form.workingHours);
    payload.set("specialtyMain", form.specialtyMain);
    payload.set("experienceYears", form.experienceYears);
    payload.set("lang", normalizeLocale(locale));

    const specialtySubs = form.specialtySubs
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)
      .filter((value) => SPECIALTIES.includes(value));

    payload.set("specialtySubs", JSON.stringify(Array.from(new Set(specialtySubs)).slice(0, 2)));
    payload.set("profileImage", profileImage, profileImage.name || "profile-image");

    setStatus("submitting");
    setMessage("");
    setResult(null);

    try {
      const response = await fetch("/api/lawyer/register", {
        method: "POST",
        body: payload,
      });

      const data = (await response.json()) as LawyerOnboardingResult;

      if (!response.ok || !data.success && !data.ok) {
        setStatus("error");
        setMessage(typeof data.error === "string" && data.error.trim() ? data.error : dictionary.portal.lawyer.failed);
        return;
      }

      setStatus("success");
      setResult(data);
      setLawyerToken(data.token ?? "");
      setMessage(dictionary.portal.lawyer.approvalNotice);
    } catch {
      setStatus("error");
      setMessage(dictionary.portal.lawyer.failed);
    }
  }

  return (
    <section className="portal-lawyer-card">
      <div className="portal-lawyer-head">
        <h3><ShieldCheck size={18} />{dictionary.portal.lawyer.title}</h3>
        <p>{dictionary.portal.lawyer.description}</p>
      </div>

      {status === "success" && result ? (
        <div className="portal-empty">
          <FileText size={52} weight="duotone" />
          <h2>{dictionary.portal.lawyer.submitted}</h2>
          <p>{message || dictionary.portal.lawyer.submitted}</p>
          {result.id ? <p>{dictionary.portal.lawyer.idLabel}: {result.id}</p> : null}
          {result.status ? <p>{dictionary.portal.lawyer.statusLabel}: {result.status}</p> : null}
          {result.countryCode ? <p>{dictionary.portal.lawyer.countryLabel}: {result.countryCode}</p> : null}
          {result.nextStep ? <p>{dictionary.portal.lawyer.nextStepLabel}: {result.nextStep}</p> : null}
          {lawyerToken ? <p>{dictionary.portal.lawyer.tokenLabel}: <span dir="ltr">{lawyerToken.slice(0, 10)}•••</span></p> : null}
          <button className="ghost-button" type="button" onClick={clear}>{dictionary.portal.lawyer.reset}</button>
        </div>
      ) : (
        <form className="portal-lawyer-grid" onSubmit={submit}>
          <label>
            <span>{dictionary.portal.lawyer.fullNameAr}</span>
            <input value={form.fullNameAr} onChange={(event) => setField("fullNameAr", event.target.value)} required />
          </label>
          <label>
            <span>{dictionary.portal.lawyer.fullNameEn}</span>
            <input value={form.fullNameEn} onChange={(event) => setField("fullNameEn", event.target.value)} required />
          </label>
          <label>
            <span>{dictionary.portal.lawyer.phone}</span>
            <input value={form.phone} onChange={(event) => setField("phone", event.target.value)} required />
          </label>
          <label>
            <span>{dictionary.portal.lawyer.email}</span>
            <input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} required />
          </label>
          <label>
            <span>{dictionary.portal.lawyer.password}</span>
            <input type="password" minLength={8} value={form.password} onChange={(event) => setField("password", event.target.value)} required />
          </label>
          <label>
            <span>{dictionary.portal.lawyer.confirmPassword}</span>
            <input type="password" value={form.confirmPassword} onChange={(event) => setField("confirmPassword", event.target.value)} required />
          </label>
          <label>
            <span>{dictionary.portal.lawyer.license}</span>
            <input value={form.licenseNumber} onChange={(event) => setField("licenseNumber", event.target.value)} required />
          </label>
          <label>
            <span>{dictionary.portal.lawyer.level}</span>
            <select value={form.registrationLevel} onChange={(event) => setField("registrationLevel", event.target.value)}>
              {REGISTRATION_LEVELS.map((value) => <option key={value} value={value}>{dictionary.portal.lawyer.registrationLevels?.[value] ?? value}</option>)}
            </select>
          </label>
          <label>
            <span>{dictionary.portal.lawyer.licenseExpiry}</span>
            <input type="date" value={form.licenseExpiryDate} onChange={(event) => setField("licenseExpiryDate", event.target.value)} required />
          </label>
          <label>
            <span>{dictionary.portal.lawyer.iban}</span>
            <input value={form.ibanNumber} onChange={(event) => setField("ibanNumber", event.target.value)} required />
          </label>
          <label>
            <span>{dictionary.portal.lawyer.experience}</span>
            <input type="number" min={0} max={80} value={form.experienceYears} onChange={(event) => setField("experienceYears", event.target.value)} required />
          </label>
          <label>
            <span>{dictionary.portal.lawyer.language}</span>
            <select value={form.language} onChange={(event) => setField("language", event.target.value)}>
              {LANG_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>{dictionary.portal.lawyer.workingHours}</span>
            <select value={form.workingHours} onChange={(event) => setField("workingHours", event.target.value)}>
              {WORKING_HOURS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>{dictionary.portal.lawyer.specialty}</span>
            <select value={form.specialtyMain} onChange={(event) => setField("specialtyMain", event.target.value)}>
              {SPECIALTIES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="portal-lawyer-grid-wide">
            <span>{dictionary.portal.lawyer.specialtySubs}</span>
            <input value={form.specialtySubs} onChange={(event) => setField("specialtySubs", event.target.value)} placeholder={dictionary.portal.lawyer.specialtySubsHint} />
          </label>
          <label className="portal-lawyer-grid-wide lawyer-file">
            <span>{dictionary.portal.lawyer.profileImage}</span>
            <input type="file" accept="image/*" onChange={(event) => setProfileImage(event.target.files?.[0] ?? null)} />
            <small>{profileImage ? profileImage.name : dictionary.portal.lawyer.profileImageHint}</small>
          </label>
          {status === "error" ? <p className="field-error" role="alert">{message}</p> : null}
          <div className="portal-auth-actions portal-lawyer-actions">
            <button className="gold-button" type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? dictionary.portal.lawyer.submitting : dictionary.portal.lawyer.submit}
            </button>
            <button type="button" className="ghost-button" onClick={() => {
              clear();
            }}>
              <Briefcase size={16} />
              {dictionary.portal.lawyer.reset}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
