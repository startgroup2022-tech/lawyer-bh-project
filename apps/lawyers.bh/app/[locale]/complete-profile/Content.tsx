"use client";
import { prepareDirectForm } from "@/lib/uploads/client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { Check, Eye, EyeOff, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import FileUploadCard from "./_components/complete-profile/FileUploadCard";
import AgreementSignatureSection from "./_components/complete-profile/AgreementSignatureSection";
import ProviderAgreementDisclosure from "@/components/ProviderAgreementDisclosure";
import {
  completeProfileInvalidProps,
  completeProfileSteps,
} from "./presentation";
import { normalizeCompleteProfileSignature } from "@/lib/provider/complete-profile-update";
import { RequiredMark } from "@/app/[locale]/join/_components/RequiredMark";
import { focusJoinField } from "@/lib/registration/join-error-navigation";
import { PROVIDER_ONBOARDING_AGREEMENT_POINTS } from "@/lib/contract/agreementTemplate";
import {
  getFirstCompleteProfileError,
  validateAllCompleteProfileSteps,
  validateCompleteProfileStep,
  type CompleteProfileFieldErrors,
  type CompleteProfileStep,
  type CompleteProfileValidationInput,
} from "@/lib/provider/complete-profile-step-validation";

const registrationLevelOptions = {
  en: [
    { value: "cassation_lawyer", label: "Lawyer before Court of Cassation" },
    { value: "practicing_lawyer", label: "Practicing Lawyer" },
    { value: "trainee_lawyer", label: "Trainee Lawyer" },
  ],
  ar: [
    { value: "cassation_lawyer", label: "محامي أمام التمييز" },
    { value: "practicing_lawyer", label: "محامي مشتغل" },
    { value: "trainee_lawyer", label: "محامي تحت التمرين" },
  ],
};

const subscriptionTypes = [
  { value: "lawyer", en: "Lawyer", ar: "محامي" },
  { value: "consultant", en: "Legal Consultant", ar: "مستشار قانوني" },
  { value: "mediator", en: "Mediator", ar: "وسيط" },
  { value: "arbitrator", en: "Arbitrator", ar: "محكم" },
  { value: "expert", en: "Expert", ar: "خبير" },
  { value: "private_executor", en: "Private Executor", ar: "منفذ خاص" },
  { value: "private_notary", en: "Private Notary", ar: "كاتب عدل خاص" },
  { value: "translator", en: "Translator", ar: "مترجم" },
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

const languageOptions = [
  { value: "Arabic", en: "Arabic", ar: "العربية" },
  { value: "English", en: "English", ar: "الإنجليزية" },
  { value: "Both", en: "Both", ar: "كلاهما" },
] as const;

const timePeriods = [
  { value: "09:00-13:00", en: "9:00 AM - 1:00 PM", ar: "9 صباحاً - 1 ظهراً" },
  { value: "13:00-17:00", en: "1:00 PM - 5:00 PM", ar: "1 ظهراً - 5 عصراً" },
  { value: "09:00-17:00", en: "9:00 AM - 5:00 PM", ar: "9 صباحاً - 5 عصراً" },
] as const;

const agreementPoints = PROVIDER_ONBOARDING_AGREEMENT_POINTS;

type InvitedLawyer = {
  id: string;
  subscriptionType: string | null;
  subscriptionTypes: string[];
  fullNameAr: string;
  fullNameEn: string;
  email: string;
  phone: string;
  registrationNo: string;
  registrationLevel: string;
  experienceYears: number | null;
  language: string;
  workingHours: string;
  specialtyMain: string;
  specialtySubs: string[];
  licenseExpiryDate: string;
  ibanNumber: string;
  crNumber: string;
  profileImageFileName: string;
  profileImagePreview: string;
  licenseFileName: string;
  licenseFileMimeType: string;
  licenseFilePreview: string;
  ibanCertificateFileName: string;
  ibanCertificateFileMimeType: string;
  ibanCertificateFilePreview: string;
  institutionLicenseFileName: string;
  institutionLicenseFileMimeType: string;
  institutionLicenseFilePreview: string;
  personalIdFileName: string;
  personalIdFileMimeType: string;
  personalIdFilePreview: string;
  signatureDataUrl: string;
  agreementAccepted: boolean;
  signedAgreementUrl: string;
};

type FileState = {
  name: string;
  preview: string | null;
  mimeType: string;
  size: number;
};

const inputClass = "h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm outline-none focus:border-primary";
const invalidInputClass = "border-red-500 focus:border-red-500";

export default function CompleteProfileContent() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const token = useSearchParams().get("token") ?? "";
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const [lawyer, setLawyer] = useState<InvitedLawyer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [agreementReady,setAgreementReady]=useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CompleteProfileFieldErrors>({});
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedSubscriptionTypes, setSelectedSubscriptionTypes] = useState<string[]>([]);
  const [mainSpecialty, setMainSpecialty] = useState("");
  const [subSpecialties, setSubSpecialties] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [signatureReady, setSignatureReady] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [isChangingSignature, setIsChangingSignature] = useState(false);
  const [signedAgreementUrl, setSignedAgreementUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profile, setProfile] = useState<FileState>({ name: "", preview: null, mimeType: "image/", size: 0 });
  const [license, setLicense] = useState<FileState>({ name: "", preview: null, mimeType: "", size: 0 });
  const [ibanCertificate, setIbanCertificate] = useState<FileState>({ name: "", preview: null, mimeType: "", size: 0 });
  const [institutionLicense, setInstitutionLicense] = useState<FileState>({ name: "", preview: null, mimeType: "", size: 0 });
  const [personalId, setPersonalId] = useState<FileState>({ name: "", preview: null, mimeType: "", size: 0 });

  const steps = [
    { title: isAr ? "بيانات المهنة" : "Professional Info", desc: isAr ? "نوع الاشتراك والتخصصات" : "Type and specialties" },
    { title: isAr ? "البيانات الشخصية" : "Personal Details", desc: isAr ? "الاسم ووسائل التواصل" : "Name and contact details" },
    { title: isAr ? "الرخصة والحساب" : "License & Bank", desc: isAr ? "الرخصة والآيبان" : "License and IBAN" },
    { title: isAr ? "الاتفاقية والتوقيع" : "Agreement & Signature", desc: isAr ? "الموافقة والتوقيع" : "Approval and signature" },
  ];
  const isLawyer = selectedSubscriptionTypes.includes("lawyer");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      if (!token) {
        setError(isAr ? "رابط الدعوة غير صحيح" : "Invalid invitation link");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/provider/complete-profile/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error ?? "Invalid invitation link");
        const item = data.lawyer as InvitedLawyer;
        setLawyer(item);
        setSelectedSubscriptionTypes(
          Array.isArray(item.subscriptionTypes) && item.subscriptionTypes.length > 0
            ? item.subscriptionTypes
            : [item.subscriptionType ?? "lawyer"],
        );
        setMainSpecialty(item.specialtyMain ?? "");
        setSubSpecialties(Array.isArray(item.specialtySubs) ? item.specialtySubs.slice(0, 2) : []);
        setAgreed(Boolean(item.agreementAccepted));
        setSignatureDataUrl(item.signatureDataUrl ?? "");
        setSignatureReady(Boolean(item.signatureDataUrl));
        setIsChangingSignature(!item.signatureDataUrl);
        setSignedAgreementUrl(item.signedAgreementUrl || (item.signatureDataUrl ? `/api/provider/signed-agreement?id=${encodeURIComponent(item.id)}` : ""));
        setProfile({ name: item.profileImageFileName ?? "", preview: item.profileImagePreview || null, mimeType: "image/jpeg", size: item.profileImageFileName ? 1 : 0 });
        setLicense({ name: item.licenseFileName ?? "", preview: item.licenseFilePreview || null, mimeType: item.licenseFileMimeType ?? "application/pdf", size: item.licenseFileName ? 1 : 0 });
        setIbanCertificate({ name: item.ibanCertificateFileName ?? "", preview: item.ibanCertificateFilePreview || null, mimeType: item.ibanCertificateFileMimeType ?? "application/pdf", size: item.ibanCertificateFileName ? 1 : 0 });
        setInstitutionLicense({ name: item.institutionLicenseFileName ?? "", preview: item.institutionLicenseFilePreview || null, mimeType: item.institutionLicenseFileMimeType ?? "application/pdf", size: item.institutionLicenseFileName ? 1 : 0 });
        setPersonalId({ name: item.personalIdFileName ?? "", preview: item.personalIdFilePreview || null, mimeType: item.personalIdFileMimeType ?? "application/pdf", size: item.personalIdFileName ? 1 : 0 });
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : isAr ? "تعذر فتح رابط الدعوة" : "Could not open invitation link");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token, isAr]);

  useEffect(() => {
    if (registerStep !== 4 || !isChangingSignature) return;

    const resize = () => {
      window.requestAnimationFrame(() => {
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
        canvas.getContext("2d")?.scale(ratio, ratio);
        signaturePad.clear();
        setSignatureDataUrl("");
        setSignatureReady(false);
      });
    };

    resize();
    const timeout = window.setTimeout(resize, 120);
    window.addEventListener("resize", resize);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("resize", resize);
    };
  }, [registerStep, isChangingSignature]);

  function replaceFile(setter: (value: FileState) => void, current: FileState, file?: File) {
    if (current.preview?.startsWith("blob:")) URL.revokeObjectURL(current.preview);
    setter({ name: file?.name ?? "", preview: file ? URL.createObjectURL(file) : null, mimeType: file?.type ?? "", size: file?.size ?? 0 });
  }

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function fileValue(file: FileState) {
    return file.name
      ? { name: file.name, size: file.size || 1, type: file.mimeType }
      : null;
  }

  function buildValidationInput(
    form: HTMLFormElement,
    finalSignature = signatureDataUrl,
  ): CompleteProfileValidationInput {
    const data = new FormData(form);
    return {
      subscriptionTypes: selectedSubscriptionTypes,
      registrationLevel: String(data.get("registrationLevel") ?? "").trim(),
      experienceYears: String(data.get("experienceYears") ?? "").trim(),
      mainSpecialty,
      subSpecialties: subSpecialties.filter(Boolean),
      profileImage: fileValue(profile),
      fullNameAr: String(data.get("fullNameAr") ?? "").trim(),
      fullNameEn: String(data.get("fullNameEn") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      password: String(data.get("password") ?? ""),
      confirmPassword: String(data.get("confirmPassword") ?? ""),
      language: String(data.get("language") ?? "").trim(),
      licenseNumber: String(data.get("licenseNumber") ?? "").trim(),
      licenseExpiryDate: String(data.get("licenseExpiryDate") ?? "").trim(),
      ibanNumber: String(data.get("ibanNumber") ?? "").trim(),
      ibanCertificateFile: fileValue(ibanCertificate),
      workingHours: String(data.get("workingHours") ?? "").trim(),
      licenseFile: fileValue(license),
      personalIdFile: fileValue(personalId),
      institutionLicenseFile: fileValue(institutionLicense),
      agreed,
      signatureDataUrl: normalizeCompleteProfileSignature(finalSignature),
    };
  }

  function showValidationErrors(
    errors: CompleteProfileFieldErrors,
    step?: CompleteProfileStep,
  ) {
    setFieldErrors(errors);
    setError(
      isAr
        ? "يرجى تصحيح الحقول الموضحة أدناه قبل المتابعة"
        : "Please correct the fields below before continuing",
    );
    const first = getFirstCompleteProfileError(errors);
    const targetStep = step ?? first?.step;
    if (targetStep) setRegisterStep(targetStep);
    if (first) {
      window.requestAnimationFrame(() => {
        const form = document.getElementById("complete-profile-form");
        if (form) focusJoinField(first.field, form);
      });
    }
  }

  function setSubSpecialty(index: number, value: string) {
    setSubSpecialties((current) => {
      const next = [...current];
      next[index] = value;
      return next.slice(0, 2);
    });
  }

  function validateStep(form: HTMLFormElement) {
    setError("");
    const errors = validateCompleteProfileStep(
      buildValidationInput(form),
      registerStep,
      isAr ? "ar" : "en",
    );
    if (Object.keys(errors).length > 0) {
      showValidationErrors(errors, registerStep);
      return false;
    }
    setFieldErrors({});
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (registerStep !== 4 || submitting || !agreementReady || !validateStep(event.currentTarget)) return;
    const canvasSignature =
      signatureRef.current && !signatureRef.current.isEmpty()
        ? signatureRef.current.toDataURL("image/png")
        : "";
    const finalSignature = normalizeCompleteProfileSignature(
      canvasSignature || signatureDataUrl,
    );
    const validationInput = buildValidationInput(event.currentTarget, finalSignature);
    const validationErrors = validateAllCompleteProfileSteps(
      validationInput,
      isAr ? "ar" : "en",
    );
    if (Object.keys(validationErrors).length > 0) {
      showValidationErrors(validationErrors);
      return;
    }
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);
    const iban = String(formData.get("ibanNumber") ?? "").replace(/\s+/g, "").toUpperCase();
    if (!/^BH\d{2}[A-Z0-9]{18}$/.test(iban)) {
      setRegisterStep(3);
      setError(isAr ? "رقم الآيبان غير صحيح. يجب أن يبدأ بـ BH ويتكون من 22 خانة" : "Invalid IBAN. It must start with BH and contain 22 characters");
      return;
    }
    const password = String(formData.get("password") ?? "");
    if (password !== String(formData.get("confirmPassword") ?? "")) {
      setRegisterStep(2);
      setError(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    formData.set("token", token);
    const primarySubscriptionType = selectedSubscriptionTypes.includes("lawyer")
      ? "lawyer"
      : selectedSubscriptionTypes[0];
    formData.set("subscriptionType", primarySubscriptionType);
    formData.set("subscriptionTypes", JSON.stringify(selectedSubscriptionTypes));
    formData.set("specialtyMain", mainSpecialty);
    formData.set("specialtySubs", JSON.stringify(subSpecialties.filter(Boolean)));
    formData.set("registrationLevel", isLawyer ? String(formData.get("registrationLevel") ?? "") : "");
    formData.set("ibanNumber", iban);
    formData.set("signatureDataUrl", finalSignature);
    formData.set("agreementAccepted", "true");
    try {
      setSubmitting(true);
      setError("");
      const response = await fetch("/api/provider/complete-profile", { method: "POST", body: await prepareDirectForm(formData, 'complete', setUploadProgress) });
      const data = await response.json().catch(() => ({}));
      if(data.error==="agreement_version_stale"||data.error==="agreement_unavailable")throw new Error(isAr?"تغيّرت الاتفاقية أو تعذر تحميلها. حدّث الصفحة واقرأها مجددًا قبل التوقيع.":"The agreement changed or is unavailable. Reload and read it again before signing.");
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Request failed");
      setSignedAgreementUrl(`/api/provider/signed-agreement?id=${encodeURIComponent(lawyer?.id ?? "")}`);
      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : isAr ? "تعذر حفظ البيانات" : "Could not save profile");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#F7F8FA] px-5 py-16 text-center text-sm font-bold text-text-muted">{isAr ? "جاري التحقق من الرابط..." : "Checking invitation link..."}</main>;
  if (submitted) return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-16">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_18px_50px_rgba(7,17,31,0.06)]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"><Check className="h-8 w-8 text-emerald-600" /></div>
        <h1 className="text-2xl font-extrabold text-text-primary">{isAr ? "تم إكمال البيانات" : "Profile Completed"}</h1>
        <p className="mt-2 text-sm leading-7 text-text-muted">{isAr ? "تم حفظ البيانات وتفعيل الحساب." : "Your details were saved and the account was activated."}</p>
        {signedAgreementUrl && <a href={signedAgreementUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white"><Eye className="h-4 w-4" />{isAr ? "معاينة الاتفاقية" : "Preview Agreement"}</a>}
        <Link href="/" className="mt-4 block text-sm font-extrabold text-primary">{isAr ? "العودة للرئيسية" : "Back to Home"}</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-3xl bg-[#07111F] p-7 text-white shadow-xl">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{isAr ? "إكمال الملف الشخصي" : "Complete Profile"}</h1>
          <p className="mt-2 text-sm leading-7 text-white/65">{isAr ? "راجع جميع بياناتك وعدّل ما يلزم قبل الحفظ." : "Review all your details and edit anything before saving."}</p>
        </div>
        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        {!lawyer ? <div className="rounded-3xl bg-white p-6 text-center text-sm font-bold text-text-muted">{isAr ? "لا يمكن عرض هذا الرابط" : "This link cannot be displayed"}</div> : (
          <form id="complete-profile-form" noValidate onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_18px_55px_rgba(7,17,31,0.08)] sm:p-6">
            <div className="mb-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">{isAr ? "خطوات التسجيل" : "Registration Steps"}</p>
              <h2 className="mt-1 text-xl font-black text-text-primary">{steps[registerStep - 1].title}</h2>
              <p className="mt-1 text-xs font-bold text-text-muted">{steps[registerStep - 1].desc}</p>
              <div className="mt-4 flex items-center gap-2">
                {completeProfileSteps.map((item, index) => <div key={item.number} className="flex flex-1 items-center gap-2">
                  <button type="button" onClick={() => item.number < registerStep && setRegisterStep(item.number)} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${registerStep === item.number ? "bg-primary text-white" : item.number < registerStep ? "bg-primary/10 text-primary" : "bg-gray-100 text-text-muted"}`}>{item.number < registerStep ? <Check size={14} /> : item.number}</button>
                  {index < completeProfileSteps.length - 1 && <div className={`h-1 flex-1 rounded-full ${item.number < registerStep ? "bg-primary/40" : "bg-gray-100"}`} />}
                </div>)}
              </div>
            </div>

            <section data-complete-step="1" className={registerStep === 1 ? "space-y-5" : "hidden"}>
              <div data-join-field="subscriptionType" role="group" aria-describedby={fieldErrors.subscriptionType ? "subscriptionType-error" : undefined} tabIndex={fieldErrors.subscriptionType ? -1 : undefined}>
                <label className="mb-1.5 block text-sm font-bold text-text-primary">{isAr ? "أنواع الاشتراك" : "Subscription Types"}<RequiredMark locale={isAr ? "ar" : "en"} /></label>
                <p className="mb-3 text-xs leading-6 text-text-muted">{isAr ? "يمكنك اختيار أكثر من صفة." : "You can select more than one role."}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{subscriptionTypes.map((item) => {
                  const selected = selectedSubscriptionTypes.includes(item.value);
                  return <button key={item.value} type="button" aria-pressed={selected} onClick={() => { clearFieldError("subscriptionType"); setSelectedSubscriptionTypes((current) => selected ? current.filter((value) => value !== item.value) : [...current, item.value]); }} className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-extrabold ${selected ? "border-primary bg-primary text-white" : fieldErrors.subscriptionType ? "border-red-500 bg-white text-text-secondary" : "border-gray-200 bg-white text-text-secondary"}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-white bg-white/15 text-white" : "border-gray-300 text-transparent"}`}><Check size={12} /></span>{isAr ? item.ar : item.en}</button>;
                })}</div>
                <FieldError field="subscriptionType" errors={fieldErrors} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field field="experienceYears" label={isAr ? "سنوات الخبرة" : "Years of Experience"} required locale={isAr ? "ar" : "en"} error={fieldErrors.experienceYears}><input id="experienceYears" name="experienceYears" type="number" min={0} max={80} required defaultValue={lawyer.experienceYears ?? ""} {...completeProfileInvalidProps("experienceYears", fieldErrors)} onChange={() => clearFieldError("experienceYears")} className={`${inputClass} ${fieldErrors.experienceYears ? invalidInputClass : ""}`} /></Field>
                {isLawyer && <Field field="registrationLevel" label={isAr ? "نوع القيد" : "Registration Level"} required locale={isAr ? "ar" : "en"} error={fieldErrors.registrationLevel}><select id="registrationLevel" name="registrationLevel" required defaultValue={lawyer.registrationLevel ?? ""} {...completeProfileInvalidProps("registrationLevel", fieldErrors)} onChange={() => clearFieldError("registrationLevel")} className={`${inputClass} ${fieldErrors.registrationLevel ? invalidInputClass : ""}`}><option value="">{isAr ? "اختر نوع القيد" : "Select registration level"}</option>{(isAr ? registrationLevelOptions.ar : registrationLevelOptions.en).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>}
              </div>
              <div data-join-field="specialties" tabIndex={fieldErrors.specialties ? -1 : undefined}>
                <Field field="specialties" label={isAr ? "التخصص الرئيسي" : "Main Specialty"} required locale={isAr ? "ar" : "en"} error={fieldErrors.specialties}><select id="specialties" value={mainSpecialty} aria-invalid={Boolean(fieldErrors.specialties)} aria-describedby={fieldErrors.specialties ? "specialties-error" : undefined} onChange={(event) => { clearFieldError("specialties"); setMainSpecialty(event.target.value); setSubSpecialties((items) => items.filter((value) => value !== event.target.value)); }} className={`${inputClass} ${fieldErrors.specialties ? invalidInputClass : ""}`}><option value="">{isAr ? "اختر التخصص الرئيسي" : "Select main specialty"}</option>{lawyerSpecialties.map((item) => <option key={item.value} value={item.value}>{isAr ? item.ar : item.en}</option>)}</select></Field>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">{[0, 1].map((index) => <Field key={index} label={isAr ? `التخصص الفرعي ${index === 0 ? "الأول" : "الثاني"}` : `${index === 0 ? "First" : "Second"} Sub-specialty`} required locale={isAr ? "ar" : "en"}><select value={subSpecialties[index] ?? ""} aria-invalid={Boolean(fieldErrors.specialties)} onChange={(event) => { clearFieldError("specialties"); setSubSpecialty(index, event.target.value); }} className={`${inputClass} ${fieldErrors.specialties ? invalidInputClass : ""}`}><option value="">{isAr ? "اختر التخصص" : "Select specialty"}</option>{lawyerSpecialties.map((item) => <option key={item.value} value={item.value} disabled={item.value === mainSpecialty || subSpecialties[index === 0 ? 1 : 0] === item.value}>{isAr ? item.ar : item.en}</option>)}</select></Field>)}</div>
              </div>
            </section>

            <section data-complete-step="2" className={registerStep === 2 ? "space-y-5" : "hidden"}>
              <FileUploadCard id="profileImage" name="profileImage" label={isAr ? "الصورة الشخصية" : "Profile Image"} accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif" fileName={profile.name} preview={profile.preview} mimeType={profile.mimeType} placeholder={isAr ? "اختر الصورة" : "Choose image"} helper="JPG, PNG, WEBP, HEIC" emptyType="image" required locale={isAr ? "ar" : "en"} error={fieldErrors.profileImage} onFileChange={(file) => { clearFieldError("profileImage"); replaceFile(setProfile, profile, file); }} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field field="fullNameAr" label={isAr ? "الاسم بالعربي" : "Arabic Name"} required locale={isAr ? "ar" : "en"} error={fieldErrors.fullNameAr}><input id="fullNameAr" name="fullNameAr" required defaultValue={lawyer.fullNameAr} {...completeProfileInvalidProps("fullNameAr", fieldErrors)} onChange={() => clearFieldError("fullNameAr")} className={`${inputClass} ${fieldErrors.fullNameAr ? invalidInputClass : ""}`} /></Field>
                <Field field="fullNameEn" label={isAr ? "الاسم بالإنجليزي" : "English Name"} required locale={isAr ? "ar" : "en"} error={fieldErrors.fullNameEn}><input id="fullNameEn" name="fullNameEn" required defaultValue={lawyer.fullNameEn} {...completeProfileInvalidProps("fullNameEn", fieldErrors)} onChange={() => clearFieldError("fullNameEn")} className={`${inputClass} ${fieldErrors.fullNameEn ? invalidInputClass : ""}`} /></Field>
                <Field field="email" label={isAr ? "البريد الإلكتروني" : "Email"} required locale={isAr ? "ar" : "en"} error={fieldErrors.email}><input id="email" name="email" type="email" required defaultValue={lawyer.email} {...completeProfileInvalidProps("email", fieldErrors)} onChange={() => clearFieldError("email")} className={`${inputClass} ${fieldErrors.email ? invalidInputClass : ""}`} /></Field>
                <Field field="phone" label={isAr ? "رقم الهاتف" : "Phone"} required locale={isAr ? "ar" : "en"} error={fieldErrors.phone}><input id="phone" name="phone" required defaultValue={lawyer.phone} {...completeProfileInvalidProps("phone", fieldErrors)} onChange={() => clearFieldError("phone")} className={`${inputClass} ${fieldErrors.phone ? invalidInputClass : ""}`} /></Field>
                <PasswordField label={isAr ? "كلمة المرور" : "Password"} name="password" visible={showPassword} toggle={() => setShowPassword((value) => !value)} locale={isAr ? "ar" : "en"} error={fieldErrors.password} clearError={() => clearFieldError("password")} />
                <PasswordField label={isAr ? "تأكيد كلمة المرور" : "Confirm Password"} name="confirmPassword" visible={showConfirmPassword} toggle={() => setShowConfirmPassword((value) => !value)} locale={isAr ? "ar" : "en"} error={fieldErrors.confirmPassword} clearError={() => clearFieldError("confirmPassword")} />
                <Field field="language" label={isAr ? "اللغة" : "Language"} required locale={isAr ? "ar" : "en"} error={fieldErrors.language}><select id="language" name="language" required defaultValue={lawyer.language ?? ""} {...completeProfileInvalidProps("language", fieldErrors)} onChange={() => clearFieldError("language")} className={`${inputClass} ${fieldErrors.language ? invalidInputClass : ""}`}><option value="">{isAr ? "اختر اللغة" : "Select language"}</option>{languageOptions.map((item) => <option key={item.value} value={item.value}>{isAr ? item.ar : item.en}</option>)}</select></Field>
              </div>
            </section>

            <section data-complete-step="3" className={registerStep === 3 ? "space-y-5" : "hidden"}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field field="licenseNumber" label={isAr ? "رقم الرخصة / الرقم الشخصي" : "License / Personal Number"} required locale={isAr ? "ar" : "en"} error={fieldErrors.licenseNumber}><input id="licenseNumber" name="licenseNumber" required defaultValue={lawyer.registrationNo} {...completeProfileInvalidProps("licenseNumber", fieldErrors)} onChange={() => clearFieldError("licenseNumber")} className={`${inputClass} ${fieldErrors.licenseNumber ? invalidInputClass : ""}`} /></Field>
                <Field field="licenseExpiryDate" label={isAr ? "تاريخ انتهاء الرخصة" : "License Expiry Date"} required locale={isAr ? "ar" : "en"} error={fieldErrors.licenseExpiryDate}><input id="licenseExpiryDate" name="licenseExpiryDate" type="date" min={today} required defaultValue={lawyer.licenseExpiryDate} {...completeProfileInvalidProps("licenseExpiryDate", fieldErrors)} onChange={() => clearFieldError("licenseExpiryDate")} className={`${inputClass} ${fieldErrors.licenseExpiryDate ? invalidInputClass : ""}`} /></Field>
                <Field label={isAr ? "رقم السجل التجاري (اختياري)" : "CR Number (Optional)"}><input name="crNumber" defaultValue={lawyer.crNumber} className={inputClass} /></Field>
                <Field field="workingHours" label={isAr ? "ساعات العمل" : "Working Hours"} required locale={isAr ? "ar" : "en"} error={fieldErrors.workingHours}><select id="workingHours" name="workingHours" required defaultValue={lawyer.workingHours ?? ""} {...completeProfileInvalidProps("workingHours", fieldErrors)} onChange={() => clearFieldError("workingHours")} className={`${inputClass} ${fieldErrors.workingHours ? invalidInputClass : ""}`}><option value="">{isAr ? "اختر ساعات العمل" : "Select working hours"}</option>{timePeriods.map((item) => <option key={item.value} value={item.value}>{isAr ? item.ar : item.en}</option>)}</select></Field>
              </div>
              <FileUploadCard id="institutionLicenseFile" name="institutionLicenseFile" label={isAr ? "رخصة المؤسسة (اختياري)" : "Institution License (Optional)"} accept=".pdf,.jpg,.jpeg,.png" fileName={institutionLicense.name} preview={institutionLicense.preview} mimeType={institutionLicense.mimeType} placeholder={isAr ? "اختر رخصة المؤسسة" : "Choose institution license"} helper="PDF, JPG, PNG" previewLabel={isAr ? "معاينة الملف" : "Preview file"} locale={isAr ? "ar" : "en"} error={fieldErrors.institutionLicenseFile} onFileChange={(file) => { clearFieldError("institutionLicenseFile"); replaceFile(setInstitutionLicense, institutionLicense, file); }} />
              <Field field="ibanNumber" label={isAr ? "رقم الآيبان" : "IBAN Number"} required locale={isAr ? "ar" : "en"} error={fieldErrors.ibanNumber}><input id="ibanNumber" name="ibanNumber" required dir="ltr" defaultValue={lawyer.ibanNumber} placeholder="BH00 XXXX XXXX XXXX XXXX XX" {...completeProfileInvalidProps("ibanNumber", fieldErrors)} onChange={() => clearFieldError("ibanNumber")} className={`${inputClass} uppercase ${fieldErrors.ibanNumber ? invalidInputClass : ""}`} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <FileUploadCard id="ibanCertificateFile" name="ibanCertificateFile" label={isAr ? "شهادة الآيبان" : "IBAN Certificate"} accept=".pdf,.jpg,.jpeg,.png" fileName={ibanCertificate.name} preview={ibanCertificate.preview} mimeType={ibanCertificate.mimeType} placeholder={isAr ? "اختر شهادة الآيبان" : "Choose IBAN certificate"} helper="PDF, JPG, PNG" previewLabel={isAr ? "معاينة الملف" : "Preview file"} required locale={isAr ? "ar" : "en"} error={fieldErrors.ibanCertificateFile} onFileChange={(file) => { clearFieldError("ibanCertificateFile"); replaceFile(setIbanCertificate, ibanCertificate, file); }} />
                <FileUploadCard id="licenseFile" name="licenseFile" label={isAr ? "رخصة الممارسة" : "Practice License"} accept=".pdf,.jpg,.jpeg,.png" fileName={license.name} preview={license.preview} mimeType={license.mimeType} placeholder={isAr ? "اختر ملف الرخصة" : "Choose license file"} helper="PDF, JPG, PNG" previewLabel={isAr ? "معاينة الملف" : "Preview file"} required locale={isAr ? "ar" : "en"} error={fieldErrors.licenseFile} onFileChange={(file) => { clearFieldError("licenseFile"); replaceFile(setLicense, license, file); }} />
                <FileUploadCard id="personalIdFile" name="personalIdFile" label={isAr ? "البطاقة الشخصية" : "Personal ID"} accept=".pdf,.jpg,.jpeg,.png" fileName={personalId.name} preview={personalId.preview} mimeType={personalId.mimeType} placeholder={isAr ? "اختر البطاقة الشخصية" : "Choose personal ID"} helper="PDF, JPG, PNG" previewLabel={isAr ? "معاينة الملف" : "Preview file"} required locale={isAr ? "ar" : "en"} error={fieldErrors.personalIdFile} onFileChange={(file) => { clearFieldError("personalIdFile"); replaceFile(setPersonalId, personalId, file); }} />
              </div>
            </section>

            <section data-complete-step="4" className={registerStep === 4 ? "space-y-5" : "hidden"}>
              <ProviderAgreementDisclosure ar={isAr} onReady={setAgreementReady}/>
              <AgreementSignatureSection isAr={isAr} points={isAr ? agreementPoints.ar : agreementPoints.en} agreed={agreed} setAgreed={setAgreed} signatureReady={signatureReady} isChangingSignature={isChangingSignature} signedAgreementUrl={signedAgreementUrl} signatureRef={signatureRef} setSignatureDataUrl={setSignatureDataUrl} setSignatureReady={setSignatureReady} setIsChangingSignature={setIsChangingSignature} setError={setError} fieldErrors={fieldErrors} clearFieldError={clearFieldError} startChangingSignature={() => { signatureRef.current?.clear(); setSignatureDataUrl(""); setSignatureReady(false); setIsChangingSignature(true); setSignedAgreementUrl(""); }} clearSignatureCanvas={() => { signatureRef.current?.clear(); setSignatureDataUrl(""); setSignatureReady(false); }} />
            </section>

            {submitting && uploadProgress !== null && <p role="status">{isAr ? 'رفع الملفات' : 'Uploading files'}: {uploadProgress}%</p>}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" disabled={registerStep === 1} onClick={() => setRegisterStep((registerStep - 1) as 1 | 2 | 3 | 4)} className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-text-primary disabled:opacity-40">{isAr ? "السابق" : "Back"}</button>
              {registerStep < 4 ? <button type="button" onClick={(event) => { const form = event.currentTarget.form; if (form && validateStep(form)) setRegisterStep((registerStep + 1) as 1 | 2 | 3 | 4); }} className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white sm:w-auto">{isAr ? "التالي" : "Next"}</button> : <button type="submit" disabled={submitting || !agreementReady} className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white disabled:opacity-40 sm:w-auto">{submitting ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "إكمال وتفعيل الحساب" : "Complete and Activate Account")}</button>}
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function Field({ field, label, required = false, locale = "en", error, children }: { field?: string; label: string; required?: boolean; locale?: "ar" | "en"; error?: string; children: React.ReactNode }) {
  return <div data-join-field={field}><label htmlFor={field} className="mb-1.5 block text-sm font-bold text-text-primary">{label}{required && <RequiredMark locale={locale} />}</label>{children}{field && <FieldError field={field} errors={error ? { [field]: error } : {}} />}</div>;
}

function FieldError({ field, errors }: { field: string; errors: Record<string, string> }) {
  if (!errors[field]) return null;
  return <p id={`${field}-error`} role="alert" className="mt-1.5 text-xs font-bold text-red-600">{errors[field]}</p>;
}

function PasswordField({ label, name, visible, toggle, locale, error, clearError }: { label: string; name: string; visible: boolean; toggle: () => void; locale: "ar" | "en"; error?: string; clearError: () => void }) {
  return <Field field={name} label={label} required locale={locale} error={error}><div className="relative"><Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" /><input id={name} name={name} type={visible ? "text" : "password"} required minLength={8} autoComplete="new-password" aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} onChange={clearError} className={`${inputClass} ltr:pl-11 ltr:pr-11 rtl:pl-11 rtl:pr-11 ${error ? invalidInputClass : ""}`} /><button type="button" onClick={toggle} aria-label={label} className="absolute top-1/2 -translate-y-1/2 text-text-muted ltr:right-4 rtl:left-4">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field>;
}
