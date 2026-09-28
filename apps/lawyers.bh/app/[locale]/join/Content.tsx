"use client";
import { prepareDirectForm } from "@/lib/uploads/client";
import { joinUploadFeedback } from "@/lib/registration/join-upload-feedback";
import { JoinSubmitError } from "./JoinSubmitError";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Scale,
  Upload,
  CheckCircle,
  Check,
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import ProviderAgreementDisclosure from "@/components/ProviderAgreementDisclosure";
import {
  getFirstJoinError,
  getJoinStepForField,
  validateAllJoinSteps,
  validateJoinStep,
  type JoinFileValue,
  type JoinValidationInput,
} from "@/lib/registration/join-step-validation";
import { PROVIDER_ONBOARDING_AGREEMENT_POINTS } from "@/lib/contract/agreementTemplate";
import { joinInvalidProps } from "@/lib/registration/join-required-fields";
import { focusJoinField } from "@/lib/registration/join-error-navigation";
import { RequiredMark } from "./_components/RequiredMark";

function FieldError({
  field,
  errors,
  className = "mt-1",
}: {
  field: string;
  errors: Record<string, string>;
  className?: string;
}) {
  if (!errors[field]) return null;

  return (
    <p
      id={`${field}-error`}
      className={`${className} text-xs font-bold text-red-600`}
    >
      {errors[field]}
    </p>
  );
}

const subscriptionTypes = {
  en: ["Lawyer", "Consultant", "Mediator", "Arbitrator", "Expert", "Private Executor", "Private Notary", "Translator"],
  ar: ["محامي", "مستشار", "وسيط", "محكم", "خبير", "منفذ خاص", "موثق خاص","مترجم"],
};

const registrationLevelOptions = {
  en: [
    {
      value: "cassation_lawyer",
      label: "Lawyer before Court of Cassation",
    },
    {
      value: "practicing_lawyer",
      label: "Practicing Lawyer",
    },
    {
      value: "trainee_lawyer",
      label: "Trainee Lawyer",
    },
  ],
  ar: [
    {
      value: "cassation_lawyer",
      label: "محامي أمام التمييز",
    },
    {
      value: "practicing_lawyer",
      label: "محامي مشتغل",
    },
    {
      value: "trainee_lawyer",
      label: "محامي تحت التمرين",
    },
  ],
};

const languageOptions = {
  en: [
    { value: "Arabic", label: "Arabic" },
    { value: "English", label: "English" },
    { value: "Both", label: "Both" },
  ],
  ar: [
    { value: "Arabic", label: "العربية" },
    { value: "English", label: "الإنجليزية" },
    { value: "Both", label: "كلاهما" },
  ],
};


const timePeriods = [
  {
    value: "09:00-13:00",
    label: { en: "First Period", ar: "الفترة الأولى" },
    range: { en: "9:00 AM - 1:00 PM", ar: "9 صباحاً - 1 ظهراً" },
  },
  {
    value: "13:00-17:00",
    label: { en: "Second Period", ar: "الفترة الثانية" },
    range: { en: "1:00 PM - 5:00 PM", ar: "1 ظهراً - 5 عصراً" },
  },
  {
    value: "09:00-17:00",
    label: { en: "Third Period", ar: "الفترة الثالثة" },
    range: { en: "9:00 AM - 5:00 PM", ar: "9 صباحاً - 5 عصراً" },
  },
] as const;


const lawyerSpecialties = [
  { value: "administrative", en: "Administrative", ar: "إدارية" },
  { value: "civil", en: "Civil", ar: "مدنية" },
  { value: "commercial", en: "Commercial", ar: "تجارية" },
  { value: "labor", en: "Labor", ar: "عمالية" },
  { value: "criminal", en: "Criminal", ar: "جنائية" },
  { value: "sharia", en: "Sharia", ar: "شرعية" },
  { value: "constitutional", en: "Constitutional", ar: "دستورية" },
  { value: "cassation", en: "Cassation", ar: "تمييز" },
  { value: "sports", en: "Sports", ar: "رياضية" },
] as const;

const agreementPoints = PROVIDER_ONBOARDING_AGREEMENT_POINTS;

type RegistrationTerms = { id:string; version:number; content:string; platformPercentageYearOne:string|null; platformPercentageYearTwo:string|null; lawyerPercentageYearOne:string|null; lawyerPercentageYearTwo:string|null };

export default function JoinPage({ registrationTerms }: { registrationTerms: RegistrationTerms | null }) {
  const [agreementReady,setAgreementReady]=useState(false);
  const lang = useLocale();
  const isAr = lang === "ar";
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [signedAgreementUrl, setSignedAgreementUrl] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<"register" | "forgot" | "reset">("register");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
const [forgotSent, setForgotSent] = useState(false);
const [forgotError, setForgotError] = useState<string | null>(null);

const [resetSubmitting, setResetSubmitting] = useState(false);
const [resetError, setResetError] = useState<string | null>(null);
const [resetSuccess, setResetSuccess] = useState(false);
const [showResetPassword, setShowResetPassword] = useState(false);
const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("resetToken") ?? "";
const signatureRef = useRef<SignatureCanvas | null>(null);
const [licenseFileName, setLicenseFileName] = useState("");
const [institutionLicenseFileName, setInstitutionLicenseFileName] = useState("");
const [personalIdFileName, setPersonalIdFileName] = useState("");
const [ibanCertificateFileName, setIbanCertificateFileName] = useState("");
const [profileImageName, setProfileImageName] = useState("");
const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
const [selectedSubscriptionTypes, setSelectedSubscriptionTypes] = useState<string[]>([]);
const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
const [selectedMainSpecialty, setSelectedMainSpecialty] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [registerStep, setRegisterStep] = useState<1 | 2 | 3 | 4>(1);

const registerSteps = [
  {
    number: 1,
    title: isAr ? "بيانات المهنة" : "Professional Info",
    desc: isAr ? "نوع الاشتراك والتخصصات" : "Type and specialties",
  },
  {
    number: 2,
    title: isAr ? "البيانات الشخصية" : "Personal Details",
    desc: isAr ? "الاسم ووسائل التواصل" : "Name and contact details",
  },
  {
    number: 3,
    title: isAr ? "الرخصة والحساب" : "License & Bank",
    desc: isAr ? "الرخصة والآيبان" : "License and IBAN",
  },
  {
    number: 4,
    title: isAr ? "الاتفاقية والتوقيع" : "Agreement & Signature",
    desc: isAr ? "الموافقة والتوقيع" : "Approval and signature",
  },
] as const;

function goToRegisterStep(step: 1 | 2 | 3 | 4) {
  setRegisterStep(step);
}

function clearFieldError(field: string) {
  setFieldErrors((current) => {
    if (!current[field]) return current;
    const next = { ...current };
    delete next[field];
    return next;
  });
  setSubmitError(null);
}

function invalidBorder(field: string) {
  return fieldErrors[field]
    ? "border-red-500 focus:border-red-500"
    : "border-gray-200 focus:border-primary";
}

function scheduleJoinFieldFocus(field: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window.requestAnimationFrame(() => {
    const form = document.getElementById("join-register-form");
    if (form) focusJoinField(field, form);
  });
}

function buildJoinValidationInput(fd: FormData): JoinValidationInput {
  const fileValue = (value: FormDataEntryValue | null): JoinFileValue =>
    value instanceof File && value.size > 0
      ? { name: value.name, size: value.size, type: value.type }
      : null;

  return {
    subscriptionTypes: selectedSubscriptionTypes,
    registrationLevel: String(fd.get("registrationLevel") ?? "").trim(),
    experienceYears: String(fd.get("experienceYears") ?? "").trim(),
    mainSpecialty: selectedMainSpecialty,
    subSpecialties: selectedSpecialties,
    profileImage: fileValue(fd.get("profileImage")),
    fullNameAr: String(fd.get("fullNameAr") ?? "").trim(),
    fullNameEn: String(fd.get("fullNameEn") ?? "").trim(),
    email: String(fd.get("email") ?? "").trim(),
    phone: String(fd.get("phone") ?? "").trim(),
    password: String(fd.get("password") ?? "").trim(),
    confirmPassword: String(fd.get("confirmPassword") ?? "").trim(),
    language: String(fd.get("language") ?? "").trim(),
    licenseNumber: String(fd.get("licenseNumber") ?? "").trim(),
    licenseExpiryDate: String(fd.get("licenseExpiryDate") ?? "").trim(),
    ibanNumber: String(fd.get("ibanNumber") ?? "")
      .trim()
      .replace(/\s+/g, "")
      .toUpperCase(),
    ibanCertificateFile: fileValue(fd.get("ibanCertificateFile")),
    workingHours: String(fd.get("workingHours") ?? "").trim(),
    licenseFile: fileValue(fd.get("licenseFile")),
    personalIdFile: fileValue(fd.get("personalIdFile")),
    institutionLicenseFile: fileValue(fd.get("institutionLicenseFile")),
    agreed,
    signatureDataUrl:
      signatureRef.current && !signatureRef.current.isEmpty()
        ? signatureRef.current.toDataURL("image/png")
        : "",
  };
}

function resizeSignatureCanvas() {
  const signaturePad = signatureRef.current;
  const canvas = signaturePad?.getCanvas();

  if (!signaturePad || !canvas) return;

  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.floor(rect.width);
  const cssHeight = Math.floor(rect.height || 160);

  if (cssWidth <= 0 || cssHeight <= 0) return;

  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const nextWidth = Math.floor(cssWidth * ratio);
  const nextHeight = Math.floor(cssHeight * ratio);

  if (canvas.width === nextWidth && canvas.height === nextHeight) return;

  canvas.width = nextWidth;
  canvas.height = nextHeight;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const context = canvas.getContext("2d");
  context?.scale(ratio, ratio);

  signaturePad.clear();
}

function handleNextStep() {
  const form = document.getElementById("join-register-form") as HTMLFormElement | null;
  const fd = form ? new FormData(form) : new FormData();
  const errors = validateJoinStep(
    buildJoinValidationInput(fd),
    registerStep,
    isAr ? "ar" : "en",
  );

  if (Object.keys(errors).length > 0) {
    const firstError = getFirstJoinError(errors);
    setFieldErrors((current) => ({ ...current, ...errors }));
    setSubmitError(null);
    if (firstError) scheduleJoinFieldFocus(firstError.field);
    return;
  }

  setFieldErrors((current) => {
    const next = { ...current };

    Object.keys(next).forEach((key) => {
      if (getJoinStepForField(key) === registerStep) {
        delete next[key];
      }
    });

    return next;
  });

  setSubmitError(null);
  setRegisterStep((registerStep + 1) as 1 | 2 | 3 | 4);
}

  const labels = isAr ? subscriptionTypes.ar : subscriptionTypes.en;
  const languages = isAr ? languageOptions.ar : languageOptions.en;
  const points = isAr ? agreementPoints.ar : agreementPoints.en;
const todayDate = new Date().toISOString().split("T")[0];
const specialties = {
  main: selectedMainSpecialty,
  subs: selectedSpecialties,
};


useEffect(() => {
  if (resetToken) {
    setMode("reset");
  } else if (searchParams.get("mode") === "forgot") {
    setMode("forgot");
  }
}, [resetToken, searchParams]);

useEffect(() => {
  if (mode !== "register" || registerStep !== 4) return;

  const resize = () => {
    window.requestAnimationFrame(() => {
      resizeSignatureCanvas();
    });
  };

  resize();

  const timeout = window.setTimeout(resize, 120);

  window.addEventListener("resize", resize);

  return () => {
    window.clearTimeout(timeout);
    window.removeEventListener("resize", resize);
  };
}, [mode, registerStep]);

useEffect(() => {
  let cancelled = false;

  async function checkSession() {
    try {
      const providerRes = await fetch("/api/provider/me", { cache: "no-store" }).catch(() => null);

      if (cancelled) return;

      if (providerRes?.ok) {
        const data = await providerRes.json().catch(() => ({}));

        if (data?.ok) {
          window.location.href = `/${lang}/provider-dashboard`;
          return;
        }
      }
    } finally {
      if (!cancelled) {
        setCheckingSession(false);
      }
    }
  }

  checkSession();

  return () => {
    cancelled = true;
  };
}, [lang]);

const setSubSpecialtyAt = (index: number, value: string) => {
  setSelectedSpecialties((prev) => {
    const next = [...prev];

    if (!value) {
      next[index] = "";
    } else {
      next[index] = value;
    }

    return Array.from(new Set(next.filter(Boolean))).slice(0, 2);
  });

  clearFieldError("specialties");
};
const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (forgotSubmitting) return;

  const fd = new FormData(e.currentTarget);
  const identifier = String(fd.get("identifier") ?? "").trim();

  if (!identifier) {
    setForgotError(
      isAr
        ? "يرجى إدخال رقم المحامي أو البريد الإلكتروني"
        : "Please enter lawyer number or email",
    );
    return;
  }

  setForgotSubmitting(true);
  setForgotError(null);

  try {
    const res = await fetch("/api/provider/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier,
        lang,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Request failed");
    }

    setForgotSent(true);
  } catch {
    setForgotError(
      isAr
        ? "تعذر إرسال رابط استرجاع كلمة المرور"
        : "Could not send password reset link",
    );
  } finally {
    setForgotSubmitting(false);
  }
};

const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (resetSubmitting) return;

  const fd = new FormData(e.currentTarget);
  const password = String(fd.get("password") ?? "").trim();
  const confirmPassword = String(fd.get("confirmPassword") ?? "").trim();

  if (!password || !confirmPassword) {
    setResetError(
      isAr
        ? "يرجى إدخال كلمة المرور وتأكيدها"
        : "Please enter and confirm your password",
    );
    return;
  }

  if (password !== confirmPassword) {
    setResetError(
      isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match",
    );
    return;
  }

  setResetSubmitting(true);
  setResetError(null);

  try {
    const res = await fetch("/api/provider/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: resetToken,
        password,
        confirmPassword,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Request failed");
    }

    setResetSuccess(true);
  } catch {
    setResetError(
      isAr
        ? "الرابط غير صالح أو منتهي الصلاحية"
        : "The reset link is invalid or expired",
    );
  } finally {
    setResetSubmitting(false);
  }
};

const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (submitting || !agreementReady) return;

  const fd = new FormData(e.currentTarget);
  const validationInput = buildJoinValidationInput(fd);
  const errors = validateAllJoinSteps(validationInput, isAr ? "ar" : "en");
  const subscriptionType = selectedSubscriptionTypes.includes("Lawyer")
    ? "Lawyer"
    : selectedSubscriptionTypes[0] ?? "";
  const {
    registrationLevel,
    experienceYears,
    workingHours,
    ibanNumber,
    signatureDataUrl,
  } = validationInput;

if (Object.keys(errors).length > 0) {
  const firstError = getFirstJoinError(errors);

  setFieldErrors(errors);
  setSubmitError(null);
  if (firstError) {
    setRegisterStep(firstError.step);
    scheduleJoinFieldFocus(firstError.field);
  }

  return;
}

  setFieldErrors({});
  setSubmitting(true);
  setSubmitError(null);

  try {
    fd.set("lang", lang);
    fd.set("signatureDataUrl", signatureDataUrl);
    fd.set("notaryId", searchParams.get("notaryId") ?? "");
    fd.set("subscriptionType", subscriptionType);
    fd.set("subscriptionTypes", JSON.stringify(selectedSubscriptionTypes));
    fd.set(
  "registrationLevel",
  selectedSubscriptionTypes.includes("Lawyer") ? registrationLevel : "",
);
fd.set("specialtyMain", selectedMainSpecialty);
fd.set("specialtySubs", JSON.stringify(selectedSpecialties));
fd.set("specialties", JSON.stringify(specialties));
fd.set("experienceYears", experienceYears);
fd.set("workingHours", workingHours);
fd.set("ibanNumber", ibanNumber);
    if (registrationTerms) fd.set("termsVersionId", registrationTerms.id);
    const res = await fetch("/api/join", {
      method: "POST",
      body: await prepareDirectForm(fd, 'join', setUploadProgress),
    });

const data = (await res.json().catch(() => ({}))) as {
  ok?: boolean;
  id?: string;
  error?: string;
  field?: string;
  redirectTo?: string;
};

    if (!res.ok || !data.ok) {
      const uploadFeedback = joinUploadFeedback(data, isAr ? "ar" : "en");
      if (uploadFeedback) {
        setFieldErrors({ [uploadFeedback.field]: uploadFeedback.message });
        setSubmitError(null);
        setRegisterStep(4);
        scheduleJoinFieldFocus(uploadFeedback.field);
        return;
      }
      if (data.error === "license_or_personal_number_required") {
        setFieldErrors((current) => ({
          ...current,
          licenseNumber: isAr
            ? "يرجى إدخال رقم الرخصة أو الرقم الشخصي"
            : "Please enter the license number or personal number",
        }));
        setSubmitError(null);
        setRegisterStep(3);
        scheduleJoinFieldFocus("licenseNumber");
        return;
      }

      if(data.error==="agreement_version_stale"||data.error==="agreement_unavailable"){
        setSubmitError(isAr?"تغيّرت الاتفاقية أو تعذر تحميلها. حدّث الصفحة واقرأ الاتفاقية مجددًا قبل التوقيع.":"The agreement changed or is unavailable. Reload and read it again before signing.");
        return;
      }
      throw new Error("Request failed");
    }

    if (data.id) {
  setSignedAgreementUrl(
    `/api/provider/signed-agreement?id=${encodeURIComponent(data.id)}`,
  );
} else {
  setSignedAgreementUrl("");
}

setSubmitted(true);

return;
  } catch {
    setSubmitError(
      isAr
        ? "تعذر إرسال الطلب. يرجى المحاولة مرة أخرى."
        : "Could not submit your application. Please try again.",
    );
  } finally {
    setSubmitting(false);
  }
};



if (checkingSession) {
  return (
    <div className="py-24 lg:py-32">
      <div className="mx-auto max-w-md px-6 text-center">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-sm font-bold text-text-muted">
          {isAr ? "جاري التحقق من تسجيل الدخول..." : "Checking login status..."}
        </p>
      </div>
    </div>
  );
}
  if (submitted) {
    return (
      <div className="py-24 lg:py-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto max-w-md px-6 text-center"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>

          <h1 className="mb-2 text-2xl font-extrabold text-text-primary">
            {isAr ? "تم استلام طلبك!" : "Application Received!"}
          </h1>

          <p className="mb-6 text-sm leading-7 text-text-muted">
            {isAr
              ? "سنراجع طلبك ونتواصل معك قريباً. يمكنك معاينة أو تحميل نسخة PDF من الاتفاقية الموقعة."
              : "We will review your application and get back to you shortly. You can preview or download a PDF copy of the signed agreement."}
          </p>

          {signedAgreementUrl && (
            <div className="mb-6 grid gap-3">
              <a
                href={signedAgreementUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-dark"
              >
                <Eye className="h-4 w-4" />
                {isAr ? "معاينة الاتفاقية الموقعة" : "Preview Signed Agreement"}
              </a>

              <a
                href={`${signedAgreementUrl}&download=1`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-white px-6 py-3 text-sm font-extrabold text-primary transition-colors hover:bg-primary/[0.04]"
              >
                <Upload className="h-4 w-4" />
                {isAr ? "تحميل الاتفاقية PDF" : "Download Agreement PDF"}
              </a>
            </div>
          )}

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-white transition-colors hover:bg-primary-dark"
          >
            <ArrowLeft size={16} className="rtl:rotate-180" />
            {isAr ? "العودة للرئيسية" : "Back to Home"}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="join-registration-page bg-[#F3F6FA] py-10 text-[#082B67] lg:py-12">
      <style jsx global>{`
        html:has(.join-registration-page),
        body:has(.join-registration-page) {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        html:has(.join-registration-page)::-webkit-scrollbar,
        body:has(.join-registration-page)::-webkit-scrollbar,
        .join-registration-page::-webkit-scrollbar,
        .join-registration-page *::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }

        .join-registration-page,
        .join-registration-page * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        .join-registration-page #join-register-form,
        .join-registration-page #join-form-card,
        .join-registration-page #join-form-card section {
          overflow: visible !important;
          max-height: none !important;
        }

        .join-registration-page #join-form-card {
          min-height: 620px;
        }

        @media (min-width: 1024px) {
          .join-registration-page #join-form-card {
            min-height: 650px;
          }
        }
      `}</style>
      <div className="max-w-3xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-2">
            {isAr ? "انضم إلى المنصة" : "Join the Platform"}
          </h1>
          <p className="text-text-muted">
            {isAr
              ? "سجل كمقدم خدمة على منصة محامون البحرين"
              : "Register as a service provider on the Lawyers.bh platform"}
          </p>
        </motion.div>
<div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-transparent bg-white p-5 text-[#082B67] shadow-sm transition hover:border-white">
  <p className="text-sm font-medium">{isAr ? "لديك حساب بالفعل؟" : "Already have an account?"}</p>
  <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-[#082B67] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#061F4A]">
    {isAr ? "تسجيل الدخول" : "Login"}
    <ArrowLeft className={isAr ? "h-4 w-4" : "h-4 w-4 rotate-180"} aria-hidden="true" />
  </Link>
</div>
       <motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 }}
>
  {mode === "forgot" ? (
  <form
    onSubmit={handleForgotPassword}
    className="space-y-5 rounded-3xl border border-transparent bg-white p-6 shadow-[0_18px_55px_rgba(7,17,31,0.08)]"
  >
    <div>
      <h2 className="text-xl font-extrabold text-text-primary">
        {isAr ? "استرجاع كلمة المرور" : "Reset Password"}
      </h2>

      <p className="mt-2 text-sm leading-6 text-text-muted">
        {isAr
          ? "أدخل رقم المحامي أو البريد الإلكتروني وسنرسل لك رابط تعيين كلمة مرور جديدة."
          : "Enter your lawyer number or email and we will send you a link to set a new password."}
      </p>
    </div>

    {forgotSent ? (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
        {isAr
          ? "إذا كان الحساب موجوداً، تم إرسال رابط استرجاع كلمة المرور إلى البريد الإلكتروني."
          : "If the account exists, a reset link has been sent to the registered email."}
      </div>
    ) : (
      <div>
        <label className="mb-1.5 block text-sm font-bold text-text-primary">
          {isAr ? "رقم المحامي أو البريد الإلكتروني" : "Lawyer number or email"}
        </label>

        <div className="relative">
          <User className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
          <input
            name="identifier"
            type="text"
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary ltr:pl-11 rtl:pr-11"
            placeholder={isAr ? "أدخل رقم المحامي أو البريد" : "Enter lawyer number or email"}
          />
        </div>
      </div>
    )}

    {forgotError && (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
        {forgotError}
      </div>
    )}

    {!forgotSent && (
      <button
        type="submit"
        disabled={forgotSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        {forgotSubmitting
          ? isAr
            ? "جاري الإرسال..."
            : "Sending..."
          : isAr
            ? "إرسال رابط الاسترجاع"
            : "Send reset link"}
      </button>
    )}

    <button
      type="button"
      onClick={() => { window.location.href = `/${lang}/login`; }}
      className="w-full text-center text-xs font-bold text-primary hover:text-primary-dark"
    >
      {isAr ? "العودة لتسجيل الدخول" : "Back to login"}
    </button>
  </form> ) : mode === "reset" ? (
  <form
    onSubmit={handleResetPassword}
    className="space-y-5 rounded-3xl border border-transparent bg-white p-6 shadow-[0_18px_55px_rgba(7,17,31,0.08)]"
  >
    <div>
      <h2 className="text-xl font-extrabold text-text-primary">
        {isAr ? "تعيين كلمة مرور جديدة" : "Set New Password"}
      </h2>

      <p className="mt-2 text-sm leading-6 text-text-muted">
        {isAr
          ? "أدخل كلمة المرور الجديدة لحسابك."
          : "Enter a new password for your account."}
      </p>
    </div>

    {resetSuccess ? (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {isAr
            ? "تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن."
            : "Password changed successfully. You can now log in."}
        </div>

        <button
          type="button"
          onClick={() => { window.location.href = `/${lang}/login`; }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark"
        >
          {isAr ? "تسجيل الدخول" : "Login"}
        </button>
      </div>
    ) : (
      <>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-text-primary">
            {isAr ? "كلمة المرور الجديدة" : "New Password"}
          </label>

          <div className="relative">
            <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
            <input
              name="password"
              type={showResetPassword ? "text" : "password"}
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary ltr:pl-11 ltr:pr-11 rtl:pr-11 rtl:pl-11"
              placeholder={isAr ? "أدخل كلمة المرور الجديدة" : "Enter new password"}
            />

            <button
              type="button"
              onClick={() => setShowResetPassword((v) => !v)}
              className="absolute top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-primary ltr:right-4 rtl:left-4"
              aria-label={showResetPassword ? "Hide password" : "Show password"}
            >
              {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <p className="mt-1 text-[11px] text-text-muted">
            {isAr
              ? "8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم"
              : "At least 8 characters, uppercase, lowercase, and a number"}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-bold text-text-primary">
            {isAr ? "تأكيد كلمة المرور" : "Confirm Password"}
          </label>

          <div className="relative">
            <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
            <input
              name="confirmPassword"
              type={showResetConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary ltr:pl-11 ltr:pr-11 rtl:pr-11 rtl:pl-11"
              placeholder={isAr ? "أعد إدخال كلمة المرور" : "Confirm password"}
            />

            <button
              type="button"
              onClick={() => setShowResetConfirmPassword((v) => !v)}
              className="absolute top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-primary ltr:right-4 rtl:left-4"
              aria-label={showResetConfirmPassword ? "Hide password" : "Show password"}
            >
              {showResetConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {resetError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {resetError}
          </div>
        )}

        <button
          type="submit"
          disabled={resetSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {resetSubmitting
            ? isAr
              ? "جاري الحفظ..."
              : "Saving..."
            : isAr
              ? "حفظ كلمة المرور الجديدة"
              : "Save new password"}
        </button>
      </>
    )}
  </form> ) : (
<form
  id="join-register-form"
  noValidate
  onSubmit={handleSubmit}
  className="space-y-6"
>
  <div
    id="join-form-card"
    className="rounded-3xl border border-transparent bg-white p-5 shadow-[0_18px_55px_rgba(7,17,31,0.08)] sm:p-6"
  >
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
            {isAr ? "خطوات التسجيل" : "Registration Steps"}
          </p>
          <h2 className="mt-1 text-xl font-black text-text-primary">
            {registerSteps[registerStep - 1].title}
          </h2>
          <p className="mt-1 text-xs font-bold text-text-muted">
            {registerSteps[registerStep - 1].desc}
          </p>
        </div>

 
      </div>

      <div className="flex items-center gap-2">
        {registerSteps.map((item, index) => (
          <div key={item.number} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              disabled={item.number > registerStep}
              onClick={() => {
                if (item.number < registerStep) {
                  goToRegisterStep(item.number);
                }
              }}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${
                registerStep === item.number
                  ? "bg-primary text-white"
                  : item.number < registerStep
                    ? "bg-primary/10 text-primary"
                    : "bg-gray-100 text-text-muted"
              }`}
            >
              {item.number < registerStep ? <Check size={14} /> : item.number}
            </button>

            {index < registerSteps.length - 1 && (
              <div
                className={`h-1 flex-1 rounded-full ${
                  item.number < registerStep ? "bg-primary/40" : "bg-gray-100"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
<section className={registerStep === 1 ? "space-y-6" : "hidden"}>
{/* Subscription Types + Experience */}
<div>
  <label className="mb-1.5 block text-sm font-bold text-text-primary">
    {isAr ? "أنواع الاشتراك" : "Subscription Types"}
    <RequiredMark locale={isAr ? "ar" : "en"} />
  </label>

  <p className="mb-3 text-xs leading-6 text-text-muted">
    {isAr
      ? "يمكنك اختيار أكثر من صفة."
      : "You can select more than one role."}
  </p>

  <input
    type="hidden"
    name="subscriptionTypes"
    value={JSON.stringify(selectedSubscriptionTypes)}
  />

  <div
    role="group"
    data-join-field="subscriptionType"
    aria-required="true"
    {...joinInvalidProps("subscriptionType", fieldErrors)}
    className={`grid grid-cols-2 gap-3 rounded-xl border p-1 sm:grid-cols-4 ${invalidBorder("subscriptionType")}`}
  >
    {subscriptionTypes.en.map((canonical, index) => {
      const selected = selectedSubscriptionTypes.includes(canonical);

      return (
        <button
          key={canonical}
          type="button"
          aria-pressed={selected}
          onClick={() => {
            setSelectedSubscriptionTypes((current) =>
              current.includes(canonical)
                ? current.filter((item) => item !== canonical)
                : [...current, canonical],
            );

            clearFieldError("subscriptionType");
            if (canonical === "Lawyer") clearFieldError("registrationLevel");
          }}
          className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center text-xs font-extrabold transition ${
            selected
              ? "border-primary bg-primary text-white shadow-sm"
              : "border-gray-200 bg-white text-text-secondary hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
          }`}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              selected
                ? "border-white bg-white/15 text-white"
                : "border-gray-300 text-transparent"
            }`}
          >
            <Check size={12} />
          </span>
          <span>{labels[index]}</span>
        </button>
      );
    })}
  </div>

  <FieldError field="subscriptionType" errors={fieldErrors} className="mt-2" />
</div>

<div>
  <label htmlFor="experienceYears" className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "سنوات الخبرة" : "Years of Experience"}
    <RequiredMark locale={isAr ? "ar" : "en"} />
  </label>

  <input
    id="experienceYears"
    name="experienceYears"
    type="number"
    min={0}
    max={80}
    required
    inputMode="numeric"
    placeholder={isAr ? "مثال: 5" : "Example: 5"}
    {...joinInvalidProps("experienceYears", fieldErrors)}
    className={`h-11 w-full rounded-lg border px-4 text-sm focus:outline-none ${invalidBorder("experienceYears")}`}
    onChange={() => clearFieldError("experienceYears")}
  />

  <FieldError field="experienceYears" errors={fieldErrors} />
</div>

{selectedSubscriptionTypes.includes("Lawyer") && (
  <div>
    <label htmlFor="registrationLevel" className="mb-1.5 block text-sm font-bold text-text-primary">
      {isAr ? "نوع القيد" : "Registration Level"}
      <RequiredMark locale={isAr ? "ar" : "en"} />
    </label>

    <select
      id="registrationLevel"
      name="registrationLevel"
      required
      defaultValue=""
      {...joinInvalidProps("registrationLevel", fieldErrors)}
      onChange={() => clearFieldError("registrationLevel")}
      className={`h-11 w-full rounded-lg border bg-white px-4 text-sm focus:outline-none ${invalidBorder("registrationLevel")}`}
    >
      <option value="">
        {isAr ? "اختر نوع القيد" : "Select registration level"}
      </option>

      {(isAr ? registrationLevelOptions.ar : registrationLevelOptions.en).map(
        (item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ),
      )}
    </select>

    <FieldError field="registrationLevel" errors={fieldErrors} className="mt-2" />
  </div>
)}

<div>
  <div className="mb-2 flex items-center justify-between gap-3">
    <label className="block text-sm font-bold text-text-primary">
      {isAr ? "التخصصات / مجالات الخدمة" : "Specialties / Service Areas"}
      <RequiredMark locale={isAr ? "ar" : "en"} />
    </label>
  </div>

<p className="mb-3 text-xs text-text-muted">
{isAr
  ? "اختر تخصصاً رئيسياً واحداً، ثم اختر تخصصين فرعيين."
  : "Choose one main specialty, then select 2 sub-specialties."}
</p>

<div
  role="group"
  className={`mb-3 rounded-xl border p-2 ${invalidBorder("specialties")}`}
  data-join-field="specialties"
  aria-required="true"
  {...joinInvalidProps("specialties", fieldErrors)}
>
  <label className="mb-1.5 block text-xs font-bold text-text-muted">
    {isAr ? "التخصص الرئيسي" : "Main Specialty"}
  </label>

  <select
    value={selectedMainSpecialty}
    onChange={(e) => {
  const value = e.target.value;

  setSelectedMainSpecialty(value);

  setSelectedSpecialties((prev) =>
    prev.filter((item) => item !== value),
  );

  clearFieldError("specialties");
}}
    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
  >
    <option value="">
      {isAr ? "اختر التخصص الرئيسي" : "Select main specialty"}
    </option>

    {lawyerSpecialties.map((item) => (
      <option key={item.value} value={item.value}>
        {isAr ? item.ar : item.en}
      </option>
    ))}
  </select>
</div>

<div className="grid gap-3 sm:grid-cols-2">
  <div>
    <label className="mb-1.5 block text-xs font-bold text-text-muted">
      {isAr ? "التخصص الفرعي الأول" : "First Sub-specialty"}
    </label>

    <select
      value={selectedSpecialties[0] ?? ""}
      onChange={(e) => setSubSpecialtyAt(0, e.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
    >
      <option value="">
        {isAr ? "اختر التخصص الفرعي الأول" : "Select first sub-specialty"}
      </option>

      {lawyerSpecialties.map((item) => (
        <option
          key={item.value}
          value={item.value}
          disabled={
  selectedMainSpecialty === item.value ||
  selectedSpecialties[1] === item.value
}
        >
          {isAr ? item.ar : item.en}
        </option>
      ))}
    </select>
  </div>

  <div>
    <label className="mb-1.5 block text-xs font-bold text-text-muted">
      {isAr ? "التخصص الفرعي الثاني" : "Second Sub-specialty"}
    </label>

    <select
      value={selectedSpecialties[1] ?? ""}
      onChange={(e) => setSubSpecialtyAt(1, e.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
    >
      <option value="">
        {isAr ? "اختر التخصص الفرعي الثاني" : "Select second sub-specialty"}
      </option>

      {lawyerSpecialties.map((item) => (
        <option
          key={item.value}
          value={item.value}
          disabled={
  selectedMainSpecialty === item.value ||
  selectedSpecialties[0] === item.value
}
        >
          {isAr ? item.ar : item.en}
        </option>
      ))}
    </select>
  </div>
</div>



  <FieldError field="specialties" errors={fieldErrors} className="mt-2" />
</div>


</section>

<section className={registerStep === 2 ? "space-y-6" : "hidden"}>
{/* Profile Image */}
<div>
  <label htmlFor="profileImage" className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "الصورة الشخصية" : "Profile Image"}
    <RequiredMark locale={isAr ? "ar" : "en"} />
  </label>

 <input
  id="profileImage"
  name="profileImage"
  type="file"
  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif"
  required
  {...joinInvalidProps("profileImage", fieldErrors)}
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    setProfileImageName(file?.name ?? "");

    if (file) {
      setProfileImagePreview(URL.createObjectURL(file));
    } else {
      setProfileImagePreview(null);
    }
    clearFieldError("profileImage");
  }}
/>

  <label
    htmlFor="profileImage"
    data-join-field="profileImage"
    className={`flex items-center gap-4 rounded-xl border bg-white p-4 cursor-pointer transition-colors ${invalidBorder("profileImage")}`}
  >
    <div className="relative flex h-[88px] w-[88px] flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/10 bg-primary/[0.035] ring-4 ring-primary/[0.025]">
      {profileImagePreview ? (
       <img
  src={profileImagePreview}
  alt={isAr ? "الصورة الشخصية" : "Profile image"}
  className="h-full w-full object-cover"
/>
      ) : (
        <User className="h-8 w-8 text-primary/45" />
      )}
    </div>

    <div>
      <p className="text-sm font-bold text-text-primary">
        {profileImageName ||
          (isAr ? "اضغط لتحميل الصورة الشخصية" : "Click to upload profile image")}
      </p>
      <p className="text-xs text-text-muted mt-1">
        JPG, PNG, WEBP, HEIC, HEIF, GIF, AVIF (max 3MB)
      </p>
    </div>
  </label>
  <FieldError field="profileImage" errors={fieldErrors} className="mt-2" />
</div>

          {/* Name fields */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label htmlFor="fullNameAr" className="block text-sm font-bold text-text-primary mb-1.5">
      {isAr ? "الاسم الكامل بالعربي" : "Full Name Arabic"}
      <RequiredMark locale={isAr ? "ar" : "en"} />
    </label>
    <input
      id="fullNameAr"
      name="fullNameAr"
      type="text"
      required
      {...joinInvalidProps("fullNameAr", fieldErrors)}
      onChange={() => clearFieldError("fullNameAr")}
      className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none ${invalidBorder("fullNameAr")}`}
    />
    <FieldError field="fullNameAr" errors={fieldErrors} />
  </div>

  <div>
    <label htmlFor="fullNameEn" className="block text-sm font-bold text-text-primary mb-1.5">
      {isAr ? "الاسم الكامل بالإنجليزي" : "Full Name English"}
      <RequiredMark locale={isAr ? "ar" : "en"} />
    </label>
    <input
      id="fullNameEn"
      name="fullNameEn"
      type="text"
      required
      {...joinInvalidProps("fullNameEn", fieldErrors)}
      onChange={() => clearFieldError("fullNameEn")}
      className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none ${invalidBorder("fullNameEn")}`}
    />
    <FieldError field="fullNameEn" errors={fieldErrors} />
  </div>
</div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-text-primary mb-1.5">
                  {isAr ? "البريد الإلكتروني" : "Email"}
                  <RequiredMark locale={isAr ? "ar" : "en"} />
                </label>
                <input id="email" name="email" type="email" required {...joinInvalidProps("email", fieldErrors)} onChange={() => clearFieldError("email")} className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none ${invalidBorder("email")}`} />
                <FieldError field="email" errors={fieldErrors} />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-bold text-text-primary mb-1.5">
                  {isAr ? "رقم الهاتف" : "Phone Number"}
                  <RequiredMark locale={isAr ? "ar" : "en"} />
                </label>
                <input id="phone" name="phone" type="tel" required {...joinInvalidProps("phone", fieldErrors)} onChange={() => clearFieldError("phone")} className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none ${invalidBorder("phone")}`} />
              <FieldError field="phone" errors={fieldErrors} />
              
              </div>
            </div>
{/* Password */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label htmlFor="password" className="block text-sm font-bold text-text-primary mb-1.5">
      {isAr ? "كلمة المرور" : "Password"}
      <RequiredMark locale={isAr ? "ar" : "en"} />
    </label>

    <div className="relative">
      <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
      <input
  id="password"
  name="password"
  type={showPassword ? "text" : "password"}
  required
  minLength={8}
  {...joinInvalidProps("password", fieldErrors)}
  onChange={() => clearFieldError("password")}
  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none ltr:pl-11 ltr:pr-11 rtl:pr-11 rtl:pl-11 ${invalidBorder("password")}`}
  placeholder={isAr ? "أدخل كلمة المرور" : "Enter password"}
/>

<button
  type="button"
  onClick={() => setShowPassword((v) => !v)}
  className="absolute top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-primary ltr:right-4 rtl:left-4"
  aria-label={showPassword ? "Hide password" : "Show password"}
>
  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button>
    </div>

    <p className="mt-1 text-[11px] text-text-muted">
      {isAr
        ? "8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم"
        : "At least 8 characters, uppercase, lowercase, and a number"}
    </p>

    <FieldError field="password" errors={fieldErrors} />
  </div>

  <div>
    <label htmlFor="confirmPassword" className="block text-sm font-bold text-text-primary mb-1.5">
      {isAr ? "تأكيد كلمة المرور" : "Confirm Password"}
      <RequiredMark locale={isAr ? "ar" : "en"} />
    </label>

    <div className="relative">
      <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
      <input
  id="confirmPassword"
  name="confirmPassword"
  type={showConfirmPassword ? "text" : "password"}
  required
  minLength={8}
  {...joinInvalidProps("confirmPassword", fieldErrors)}
  onChange={() => clearFieldError("confirmPassword")}
  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none ltr:pl-11 ltr:pr-11 rtl:pr-11 rtl:pl-11 ${invalidBorder("confirmPassword")}`}
  placeholder={isAr ? "أعد إدخال كلمة المرور" : "Confirm password"}
/>

<button
  type="button"
  onClick={() => setShowConfirmPassword((v) => !v)}
  className="absolute top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-primary ltr:right-4 rtl:left-4"
  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
>
  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button>
    </div>

    <FieldError field="confirmPassword" errors={fieldErrors} />
  </div>
</div>
            {/* Language */}
            <div>
              <label htmlFor="language" className="block text-sm font-bold text-text-primary mb-1.5">
                {isAr ? "اللغة" : "Language"}
                <RequiredMark locale={isAr ? "ar" : "en"} />
              </label>
              <select id="language" name="language" required defaultValue="" {...joinInvalidProps("language", fieldErrors)} onChange={() => clearFieldError("language")} className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none bg-white ${invalidBorder("language")}`}>
                <option value="" disabled>
                  {isAr ? "اختر اللغة" : "Select language"}
                </option>
                {languages.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              <FieldError field="language" errors={fieldErrors} />
            </div>

</section>

<section className={registerStep === 3 ? "space-y-6" : "hidden"}>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label htmlFor="licenseNumber" className="block text-sm font-bold text-text-primary mb-1.5">
{isAr ? "رقم الرخصة / الرقم الشخصي" : "License Number / Personal Number"}
      <RequiredMark locale={isAr ? "ar" : "en"} />
    </label>

    <input
      id="licenseNumber"
      name="licenseNumber"
      type="text"
      required
      {...joinInvalidProps("licenseNumber", fieldErrors)}
      onChange={() => clearFieldError("licenseNumber")}
      className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none ${invalidBorder("licenseNumber")}`}
    />

    <FieldError field="licenseNumber" errors={fieldErrors} />
  </div>

  <div>
    <label htmlFor="licenseExpiryDate" className="block text-sm font-bold text-text-primary mb-1.5">
      {isAr ? "تاريخ انتهاء الرخصة" : "License Expiry Date"}
      <RequiredMark locale={isAr ? "ar" : "en"} />
    </label>

    <input
      id="licenseExpiryDate"
      name="licenseExpiryDate"
      type="date"
      required
      min={todayDate}
      {...joinInvalidProps("licenseExpiryDate", fieldErrors)}
      onChange={() => clearFieldError("licenseExpiryDate")}
      className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none ${invalidBorder("licenseExpiryDate")}`}
    />

    <FieldError field="licenseExpiryDate" errors={fieldErrors} />
  </div>
</div>

<div className="rounded-2xl border border-dashed border-primary/20 bg-primary/[0.025] p-4 sm:p-5">
  <div className="mb-4">
    <h3 className="text-sm font-black text-text-primary">
      {isAr ? "بيانات المؤسسة" : "Institution Details"}
    </h3>
    <p className="mt-1 text-xs leading-6 text-text-muted">
      {isAr
        ? "رقم السجل التجاري ورخصة المؤسسة اختياري."
        : "The commercial registration number and institution license are optional."}
    </p>
  </div>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
      <label className="mb-1.5 block text-sm font-bold text-text-primary">
        {isAr ? "رقم السجل التجاري (اختياري)" : "CR Number (Optional)"}
      </label>

      <input
        name="crNumber"
        type="text"
        maxLength={80}
        placeholder={isAr ? "مثال: 123456-1" : "Example: 123456-1"}
        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm focus:border-primary focus:outline-none"
        onChange={() => {
          setFieldErrors((current) => {
            const next = { ...current };
            delete next.crNumber;
            return next;
          });
        }}
      />
    </div>

    <div>
      <label className="mb-1.5 block text-sm font-bold text-text-primary">
        {isAr ? "رخصة المؤسسة (اختياري)" : "Institution License (Optional)"}
      </label>

      <input
        id="institutionLicenseFile"
        name="institutionLicenseFile"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setInstitutionLicenseFileName(file?.name ?? "");

          setFieldErrors((current) => {
            const next = { ...current };
            delete next.institutionLicenseFile;
            return next;
          });
        }}
      />

      <label
        htmlFor="institutionLicenseFile"
        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm transition hover:border-primary/40"
      >
        <Upload className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 truncate text-text-muted">
          {institutionLicenseFileName ||
            (isAr ? "اختر ملف رخصة المؤسسة" : "Choose institution license file")}
        </span>
      </label>

      <FieldError field="institutionLicenseFile" errors={fieldErrors} />
    </div>
  </div>
</div>

<div>
  <label htmlFor="ibanNumber" className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "رقم الآيبان" : "IBAN Number"}
    <RequiredMark locale={isAr ? "ar" : "en"} />
  </label>

  <input
    id="ibanNumber"
    name="ibanNumber"
    type="text"
    required
    dir="ltr"
    placeholder="BH00 XXXX XXXX XXXX XXXX XX"
    {...joinInvalidProps("ibanNumber", fieldErrors)}
    className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none ${invalidBorder("ibanNumber")}`}
    onChange={() => clearFieldError("ibanNumber")}
  />

  <FieldError field="ibanNumber" errors={fieldErrors} />
</div>

<div>
  <label htmlFor="ibanCertificateFile" className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "شهادة الآيبان" : "IBAN Certificate"}
    <RequiredMark locale={isAr ? "ar" : "en"} />
  </label>

  <input
    id="ibanCertificateFile"
    name="ibanCertificateFile"
    type="file"
    required
    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
    {...joinInvalidProps("ibanCertificateFile", fieldErrors)}
    className="hidden"
    onChange={(event) => {
      const file = event.target.files?.[0];

      setIbanCertificateFileName(file?.name ?? "");

      clearFieldError("ibanCertificateFile");
    }}
  />

  <label
    htmlFor="ibanCertificateFile"
    data-join-field="ibanCertificateFile"
    className={`block border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${invalidBorder("ibanCertificateFile")}`}
  >
    <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />

    <p className="text-sm text-text-muted">
      {ibanCertificateFileName ||
        (isAr ? "اضغط لتحميل شهادة الآيبان" : "Click to upload IBAN certificate")}
    </p>

    <p className="text-xs text-text-muted mt-1">PDF, JPG, PNG (max 5MB)</p>
  </label>

  <FieldError field="ibanCertificateFile" errors={fieldErrors} className="mt-2" />
</div>

<div>
  <label htmlFor="workingHours" className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "ساعات العمل" : "Working Hours"}
    <RequiredMark locale={isAr ? "ar" : "en"} />
  </label>

  <select
    id="workingHours"
    name="workingHours"
    required
    defaultValue=""
    {...joinInvalidProps("workingHours", fieldErrors)}
    onChange={() => clearFieldError("workingHours")}
    className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none bg-white ${invalidBorder("workingHours")}`}
  >
    <option value="" disabled>
      {isAr ? "اختر ساعات العمل" : "Select working hours"}
    </option>

    {timePeriods.map((period) => (
      <option key={period.value} value={period.value}>
        {isAr
          ? `${period.label.ar} - ${period.range.ar}`
          : `${period.label.en} - ${period.range.en}`}
      </option>
    ))}
  </select>

  <FieldError field="workingHours" errors={fieldErrors} />
</div>


          {/* License Upload */}
<div>
  <label htmlFor="licenseFile" className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "رخصة الممارسة" : "Practice License"}
    <RequiredMark locale={isAr ? "ar" : "en"} />
  </label>

  <input
    id="licenseFile"
    name="licenseFile"
    type="file"
    accept=".pdf,.jpg,.jpeg,.png"
    required
    {...joinInvalidProps("licenseFile", fieldErrors)}
    className="hidden"
    onChange={(e) => {
      setLicenseFileName(e.target.files?.[0]?.name ?? "");
      clearFieldError("licenseFile");
    }}
  />

  <label
    htmlFor="licenseFile"
    data-join-field="licenseFile"
    className={`block border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${invalidBorder("licenseFile")}`}
  >
    <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
    <p className="text-sm text-text-muted">
      {licenseFileName ||
        (isAr ? "اضغط لتحميل رخصة الممارسة" : "Click to upload practice license")}
    </p>
    <p className="text-xs text-text-muted mt-1">PDF, JPG, PNG (max 5MB)</p>
  </label>
  
<FieldError field="licenseFile" errors={fieldErrors} className="mt-2" />
</div>

{/* Personal ID Card Upload */}
<div>
  <label htmlFor="personalIdFile" className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "البطاقة الشخصية" : "Personal ID Card"}
    <RequiredMark locale={isAr ? "ar" : "en"} />
  </label>

  <input
    id="personalIdFile"
    name="personalIdFile"
    type="file"
    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
    required
    {...joinInvalidProps("personalIdFile", fieldErrors)}
    className="hidden"
    onChange={(e) => {
      setPersonalIdFileName(e.target.files?.[0]?.name ?? "");

      clearFieldError("personalIdFile");
    }}
  />

  <label
    htmlFor="personalIdFile"
    data-join-field="personalIdFile"
    className={`block border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${invalidBorder("personalIdFile")}`}
  >
    <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />

    <p className="text-sm text-text-muted">
      {personalIdFileName ||
        (isAr ? "اضغط لتحميل البطاقة الشخصية" : "Click to upload personal ID card")}
    </p>

    <p className="text-xs text-text-muted mt-1">PDF, JPG, PNG (max 5MB)</p>
  </label>

  <FieldError field="personalIdFile" errors={fieldErrors} className="mt-2" />
</div>

</section>

<section className={registerStep === 4 ? "space-y-6" : "hidden"}>
            {/* Agreement */}
            <div
              role="group"
              data-join-field="agreed"
              aria-required="true"
              {...joinInvalidProps("agreed", fieldErrors)}
              className={`bg-bg-light rounded-xl p-5 border ${fieldErrors.agreed ? "border-red-500" : "border-gray-100"}`}
            >
              <h3 className="flex items-center gap-2 font-bold text-text-primary mb-4">
                <Scale className="w-5 h-5 text-primary" />
                {isAr ? "اتفاقية مقدم الخدمة" : "Service Provider Agreement"}
              </h3>
              {registrationTerms ? <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <p className="rounded-xl bg-white p-3 text-sm font-bold">{isAr ? "نسبة المنصة في السنة الأولى" : "Platform share in year one"}: {registrationTerms.platformPercentageYearOne}%</p>
                <p className="rounded-xl bg-white p-3 text-sm font-bold">{isAr ? "نسبة المحامي في السنة الأولى" : "Lawyer share in year one"}: {registrationTerms.lawyerPercentageYearOne}%</p>
                <p className="rounded-xl bg-white p-3 text-sm font-bold">{isAr ? "نسبة المنصة من السنة الثانية" : "Platform share from year two"}: {registrationTerms.platformPercentageYearTwo}%</p>
                <p className="rounded-xl bg-white p-3 text-sm font-bold">{isAr ? "نسبة المحامي من السنة الثانية" : "Lawyer share from year two"}: {registrationTerms.lawyerPercentageYearTwo}%</p>
              </div> : <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">{isAr ? "تعذر تحميل شروط تسجيل المحامين. أعد تحميل الصفحة قبل إرسال التسجيل." : "Registration terms could not be loaded. Reload the page before submitting."}</p>}
              <ol className="space-y-3 mb-5">
                {(registrationTerms?.content.split(/\n\s*\n/).filter(Boolean) ?? points).map((point, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-sm text-text-muted leading-relaxed">{point}</span>
                  </li>
                ))}
              </ol>
              <ProviderAgreementDisclosure ar={isAr} onReady={setAgreementReady}/>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  aria-required="true"
                  {...joinInvalidProps("agreed", fieldErrors)}
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    clearFieldError("agreed");
                  }}
                  className="accent-primary mt-1"
                />
                <span className="text-sm text-text-secondary">
                  {isAr
                    ? "أوافق على الشروط والأحكام واتفاقية مقدم الخدمة"
                    : "I agree to the Terms & Conditions and Service Provider Agreement"}
                  <RequiredMark locale={isAr ? "ar" : "en"} />
                </span>
              </label>


              <FieldError field="agreed" errors={fieldErrors} className="mt-3" />
            </div>


{/* Signature */}
<div>
  <label className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "التوقيع الإلكتروني" : "Electronic Signature"}
    <RequiredMark locale={isAr ? "ar" : "en"} />
  </label>

  <div
    role="group"
    data-join-field="signatureDataUrl"
    aria-required="true"
    {...joinInvalidProps("signatureDataUrl", fieldErrors)}
    className={`rounded-xl border bg-white p-3 ${invalidBorder("signatureDataUrl")}`}
  >
    <SignatureCanvas
      ref={signatureRef}
      penColor="black"
      onEnd={() => {
        clearFieldError("signatureDataUrl");
      }}
      canvasProps={{
        className: "block h-40 w-full rounded-lg bg-white touch-none",
        style: {
          width: "100%",
          height: "160px",
          display: "block",
          touchAction: "none",
        },
      }}
    />
    
  </div>

  <div className="flex justify-end mt-2">
    <button
      type="button"
      onClick={() => signatureRef.current?.clear()}
      className="text-sm font-bold text-red-600 hover:text-red-700"
    >
      {isAr ? "مسح التوقيع" : "Clear Signature"}
    </button>
  </div>

  <FieldError field="signatureDataUrl" errors={fieldErrors} className="mt-2" />
</div>

</section>

            {submitting && uploadProgress !== null && <p role="status">{isAr ? 'رفع الملفات' : 'Uploading files'}: {uploadProgress}%</p>}
            {submitError && Object.keys(fieldErrors).length === 0 && (
              <JoinSubmitError message={submitError} />
            )}


            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => goToRegisterStep((registerStep - 1) as 1 | 2 | 3 | 4)}
                disabled={registerStep === 1}
                className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-text-primary transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isAr ? "السابق" : "Back"}
              </button>

              {registerStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark sm:w-auto"
                >
                  {isAr ? "التالي" : "Next"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || !registrationTerms || !agreementReady}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  <CheckCircle size={18} />
                  {submitting
                    ? isAr
                      ? "جاري الإرسال..."
                      : "Sending..."
                    : isAr
                      ? "تقديم الطلب"
                      : "Submit Application"}
                </button>
              )}
            </div>
            </div>
          </form>
      )}
</motion.div>
      </div>
    </div>
  );
}
