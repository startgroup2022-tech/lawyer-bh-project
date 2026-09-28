"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Mail,
  Plus,
  Upload,
  User,
  UserPlus,
} from "lucide-react";
import { useLocale } from "next-intl";
import SignatureCanvas from "react-signature-canvas";
import {
  lawyerProfileCompletionEmailHtml,
  lawyerProfileCompletionEmailSubject,
  lawyerProfileCompletionEmailText,
} from "./emailTemplates";
import { runExplicitAdd } from "./submission-policy";

const subscriptionTypeOptions = {
  en: [
    { value: "lawyer", label: "Lawyer" },
    { value: "consultant", label: "Legal Consultant" },
    { value: "mediator", label: "Mediator" },
    { value: "arbitrator", label: "Arbitrator" },
    { value: "expert", label: "Expert" },
    { value: "private_executor", label: "Private Executor" },
    { value: "private_notary", label: "Private Notary" },
    { value: "translator", label: "Legal Translator" },
  ],
  ar: [
    { value: "lawyer", label: "محامي" },
    { value: "consultant", label: "مستشار قانوني" },
    { value: "mediator", label: "وسيط" },
    { value: "arbitrator", label: "محكم" },
    { value: "expert", label: "خبير" },
    { value: "private_executor", label: "منفذ خاص" },
    { value: "private_notary", label: "موثق خاص" },
    { value: "translator", label: "مترجم قانوني" },
  ],
};

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

const defaultSpecialtyOptions = {
  en: [
    { value: "criminal", label: "Criminal" },
    { value: "civil", label: "Civil" },
    { value: "sharia", label: "Sharia / Family" },
    { value: "commercial", label: "Commercial" },
    { value: "labor", label: "Labor" },
    { value: "administrative", label: "Administrative" },
    { value: "constitutional", label: "Constitutional" },
    { value: "cassation", label: "Cassation" },
    { value: "sports", label: "Sports" },
  ],
  ar: [
    { value: "criminal", label: "جنائي" },
    { value: "civil", label: "مدني" },
    { value: "sharia", label: "شرعي / أسري" },
    { value: "commercial", label: "تجاري" },
    { value: "labor", label: "عمالي" },
    { value: "administrative", label: "إداري" },
    { value: "constitutional", label: "دستوري" },
    { value: "cassation", label: "تمييز" },
    { value: "sports", label: "رياضي" },
  ],
};

type LegalCaseCategory = {
  id: string;
  key: string;
  name: string;
};

type AdminAddLawyerContentProps = {
  legalCaseCategories?: LegalCaseCategory[];
};

type RegisterStep = 1 | 2 | 3 | 4;

function normalizeIban(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function getFormText(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

export default function AdminAddLawyerContent({
  legalCaseCategories = [],
}: AdminAddLawyerContentProps) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const signatureRef = useRef<SignatureCanvas | null>(null);

  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [completionLink, setCompletionLink] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [inviteRecipientName, setInviteRecipientName] = useState("");
  const [inviteRecipientEmail, setInviteRecipientEmail] = useState("");
  const [sendingInviteEmail, setSendingInviteEmail] = useState(false);
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [inviteEmailError, setInviteEmailError] = useState("");

  const [selectedSubscriptionType, setSelectedSubscriptionType] =
    useState("lawyer");
  const [selectedMainSpecialty, setSelectedMainSpecialty] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  const [profileImageName, setProfileImageName] = useState("");
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null,
  );
  const [licenseFileName, setLicenseFileName] = useState("");
  const [ibanCertificateFileName, setIbanCertificateFileName] = useState("");
  const [signatureFileName, setSignatureFileName] = useState("");

  const todayDate = new Date().toISOString().split("T")[0];
  const providerTypes = isAr
    ? subscriptionTypeOptions.ar
    : subscriptionTypeOptions.en;
  const languages = isAr ? languageOptions.ar : languageOptions.en;
  const specialtyOptions =
    legalCaseCategories.length > 0
      ? legalCaseCategories.map((category) => ({
          value: category.key,
          label: category.name,
        }))
      : isAr
        ? defaultSpecialtyOptions.ar
        : defaultSpecialtyOptions.en;

  const registerSteps = [
    {
      number: 1,
      title: isAr ? "بيانات المهنة" : "Professional Info",
      desc: isAr
        ? "نوع مقدم الخدمة والتخصصات"
        : "Provider type and specialties",
    },
    {
      number: 2,
      title: isAr ? "البيانات الشخصية" : "Personal Details",
      desc: isAr ? "الاسم ووسائل التواصل" : "Name and contact details",
    },
    {
      number: 3,
      title: isAr ? "الرخصة والحساب" : "License & Bank",
      desc: isAr ? "بيانات اختيارية" : "Optional details",
    },
    {
      number: 4,
      title: isAr ? "الملفات والتوقيع" : "Files & Signature",
      desc: isAr ? "كلها اختيارية" : "All optional",
    },
  ] as const;

  const msg = (ar: string, en: string) => (isAr ? ar : en);

  function getStepForField(field: string): RegisterStep {
    if (["fullNameAr", "email", "phone"].includes(field)) return 2;
    return 1;
  }

  function validateRequiredDetails(fd: FormData) {
    const errors: Record<string, string> = {};
    const fullNameAr = String(fd.get("fullNameAr") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();

    if (!fullNameAr) {
      errors.fullNameAr = msg("يرجى إدخال الاسم", "Please enter the name");
    }

    if (!email) {
      errors.email = msg(
        "يرجى إدخال البريد الإلكتروني",
        "Please enter the email address",
      );
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = msg("البريد الإلكتروني غير صحيح", "Invalid email address");
    }

    if (!phone) {
      errors.phone = msg(
        "يرجى إدخال رقم الهاتف",
        "Please enter the phone number",
      );
    }

    return errors;
  }

  function goToRegisterStep(step: RegisterStep) {
    if (step <= registerStep) {
      setRegisterStep(step);
    }
  }

  function handleNextStep() {
    const form = document.getElementById(
      "admin-add-provider-form",
    ) as HTMLFormElement | null;
    const fd = form ? new FormData(form) : new FormData();

    if (registerStep === 2) {
      const errors = validateRequiredDetails(fd);

      if (Object.keys(errors).length > 0) {
        setFieldErrors((current) => ({ ...current, ...errors }));
        setError("");
        return;
      }
    }

    setFieldErrors((current) => {
      const next = { ...current };
      delete next.fullNameAr;
      delete next.email;
      delete next.phone;
      return next;
    });
    setError("");
    setRegisterStep((registerStep + 1) as RegisterStep);
  }

  const setSubSpecialtyAt = (index: number, value: string) => {
    setSelectedSpecialties((prev) => {
      const next = [...prev];
      next[index] = value;
      return Array.from(new Set(next.filter(Boolean))).slice(0, 2);
    });
  };

  const resetFormState = () => {
    setProfileImageName("");
    setProfileImagePreview(null);
    setLicenseFileName("");
    setIbanCertificateFileName("");
    setSignatureFileName("");
    setSelectedSubscriptionType("lawyer");
    setSelectedMainSpecialty("");
    setSelectedSpecialties([]);
    setFieldErrors({});
    setRegisterStep(1);
    signatureRef.current?.clear();
  };

  const handleExplicitAdd = async (form: HTMLFormElement) => {
    if (submitting) return;

    const fd = new FormData(form);
    const errors = validateRequiredDetails(fd);

    if (Object.keys(errors).length > 0) {
      const firstErrorKey = Object.keys(errors)[0];
      setFieldErrors(errors);
      setRegisterStep(getStepForField(firstErrorKey));
      setError("");
      return;
    }

    const signatureDataUrl =
      signatureRef.current && !signatureRef.current.isEmpty()
        ? signatureRef.current.toDataURL("image/png")
        : "";
    const subscriptionType = String(
      fd.get("subscriptionType") || selectedSubscriptionType || "lawyer",
    ).trim();
    const ibanNumber = normalizeIban(fd.get("ibanNumber"));
    const inviteName = String(
      (isAr
        ? fd.get("fullNameAr") || fd.get("fullNameEn")
        : fd.get("fullNameEn") || fd.get("fullNameAr")) ?? "",
    ).trim();
    const inviteEmail = getFormText(fd, "email");
    fd.set("lang", locale);
    fd.set("subscriptionType", subscriptionType || "lawyer");
    fd.set(
      "registrationLevel",
      subscriptionType === "lawyer"
        ? String(fd.get("registrationLevel") ?? "")
        : "",
    );
    fd.set("signatureDataUrl", signatureDataUrl);
    fd.set("specialtyMain", selectedMainSpecialty);
    fd.set("specialtySubs", JSON.stringify(selectedSpecialties));
    fd.set(
      "specialties",
      JSON.stringify({
        main: selectedMainSpecialty,
        subs: selectedSpecialties,
      }),
    );
    fd.set("ibanNumber", ibanNumber);

    try {
      setSubmitting(true);
      setError("");
      setFieldErrors({});
      setCompletionLink("");
      setWhatsappLink("");
      setInviteEmailSent(false);
      setInviteEmailError("");
      setInviteRecipientName("");
      setInviteRecipientEmail("");

      const res = await fetch("/api/admin/lawyers/invite", {
        method: "POST",
        body: fd,
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        completionLink?: string;
        whatsappLink?: string;
        emailSent?: boolean;
        emailError?: string | null;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Request failed");
      }

      setCompletionLink(data.completionLink ?? "");
      setWhatsappLink(data.whatsappLink ?? "");
      setInviteRecipientName(inviteName);
      setInviteRecipientEmail(inviteEmail);
      setInviteEmailSent(data.emailSent === true);
      setInviteEmailError(
        data.emailSent
          ? ""
          : isAr
            ? "تمت إضافة المحامي، لكن تعذر إرسال البريد تلقائيًا. يمكنك إعادة الإرسال من الزر أدناه."
            : data.emailError ||
              "The lawyer was added, but the automatic invitation email failed. You can retry below.",
      );

      form.reset();
      resetFormState();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
            ? "تعذر إضافة مقدم الخدمة"
            : "Could not add provider",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!completionLink) return;
    await navigator.clipboard.writeText(completionLink);
  };

  const inviteEmailSubject = lawyerProfileCompletionEmailSubject();
  const inviteEmailText = completionLink
    ? lawyerProfileCompletionEmailText({
        lawyerName: inviteRecipientName,
        profileCompletionUrl: completionLink,
      })
    : "";
  const inviteEmailHtml = completionLink
    ? lawyerProfileCompletionEmailHtml({
        lawyerName: inviteRecipientName,
        profileCompletionUrl: completionLink,
      })
    : "";
  const copyEmailText = async () => {
    if (!inviteEmailText) return;
    await navigator.clipboard.writeText(inviteEmailText);
  };

  const copyEmailHtml = async () => {
    if (!inviteEmailHtml) return;
    await navigator.clipboard.writeText(inviteEmailHtml);
  };

  const sendInviteHtmlEmail = async () => {
    if (!completionLink || !inviteRecipientEmail || !inviteEmailHtml) return;

    try {
      setSendingInviteEmail(true);
      setInviteEmailSent(false);
      setInviteEmailError("");

      const res = await fetch("/api/admin/lawyers/send-invite-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: inviteRecipientEmail,
          subject: inviteEmailSubject,
          html: inviteEmailHtml,
          text: inviteEmailText,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not send email");
      }

      setInviteEmailSent(true);
    } catch (err) {
      setInviteEmailError(
        err instanceof Error
          ? err.message
          : isAr
            ? "تعذر إرسال قالب الإيميل"
            : "Could not send the email template",
      );
    } finally {
      setSendingInviteEmail(false);
    }
  };

  return (
    <main className="join-registration-page min-h-screen bg-[#F7F8FA] px-5 py-10 lg:py-12">
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

        .join-registration-page #admin-add-provider-form,
        .join-registration-page #admin-form-card,
        .join-registration-page #admin-form-card section {
          overflow: visible !important;
          max-height: none !important;
        }

        .join-registration-page #admin-form-card {
          min-height: 620px;
        }

        @media (min-width: 1024px) {
          .join-registration-page #admin-form-card {
            min-height: 650px;
          }
        }
      `}</style>

      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 rounded-3xl bg-[#B4232A] p-7 text-white shadow-xl"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <UserPlus className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-extrabold sm:text-3xl">
            {isAr ? "إضافة مقدم خدمة" : "Add Service Provider"}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/65">
            {isAr
              ? "أدخل بيانات مقدم الخدمة، ولن تتم الإضافة أو إرسال دعوة الانضمام إلا عند الضغط على زر الإضافة في الخطوة الأخيرة."
              : "Enter the provider details. The lawyer will only be added and invited after clicking the final Add button."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <form
            id="admin-add-provider-form"
            noValidate
            onSubmit={(event) => event.preventDefault()}
            className="space-y-6"
          >
            <div
              id="admin-form-card"
              className="rounded-3xl border border-transparent bg-white transition hover:border-[#B4232A] focus-within:border-[#B4232A] p-5 shadow-[0_18px_50px_rgba(7,17,31,0.06)] sm:p-6"
            >
              <div className="mb-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
                      {isAr ? "خطوات الإضافة" : "Add Provider Steps"}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-text-primary">
                      {registerSteps[registerStep - 1].title}
                    </h2>
                    <p className="mt-1 text-xs font-bold text-text-muted">
                      {registerSteps[registerStep - 1].desc}
                    </p>
                  </div>

                  <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex">
                    <UserPlus className="h-6 w-6" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {registerSteps.map((item, index) => (
                    <div
                      key={item.number}
                      className="flex flex-1 items-center gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => goToRegisterStep(item.number)}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${
                          registerStep === item.number
                            ? "bg-primary text-white"
                            : item.number < registerStep
                              ? "bg-primary/10 text-primary"
                              : "bg-gray-100 text-text-muted"
                        }`}
                      >
                        {item.number < registerStep ? (
                          <Check size={14} />
                        ) : (
                          item.number
                        )}
                      </button>

                      {index < registerSteps.length - 1 && (
                        <div
                          className={`h-1 flex-1 rounded-full ${
                            item.number < registerStep
                              ? "bg-primary/40"
                              : "bg-gray-100"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <section className={registerStep === 1 ? "space-y-6" : "hidden"}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr ? "نوع مقدم الخدمة" : "Provider Type"}
                    </label>
                    <select
                      name="subscriptionType"
                      value={selectedSubscriptionType}
                      onChange={(event) => {
                        setSelectedSubscriptionType(event.target.value);
                        setFieldErrors((current) => {
                          const next = { ...current };
                          delete next.registrationLevel;
                          return next;
                        });
                      }}
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm outline-none focus:border-primary"
                    >
                      {providerTypes.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr ? "سنوات الخبرة" : "Years of Experience"}
                    </label>
                    <input
                      name="experienceYears"
                      type="number"
                      min={0}
                      max={80}
                      inputMode="numeric"
                      placeholder={isAr ? "اختياري" : "Optional"}
                      className="h-11 w-full rounded-lg border border-gray-200 px-4 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {selectedSubscriptionType === "lawyer" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr ? "نوع القيد" : "Registration Level"}
                    </label>
                    <select
                      name="registrationLevel"
                      defaultValue=""
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm outline-none focus:border-primary"
                    >
                      <option value="">
                        {isAr ? "اختر نوع القيد" : "Select registration level"}
                      </option>
                      {(isAr
                        ? registrationLevelOptions.ar
                        : registrationLevelOptions.en
                      ).map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-bold text-text-primary">
                      {isAr
                        ? "التخصصات / مجالات الخدمة"
                        : "Specialties / Service Areas"}
                    </label>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary">
                      {isAr ? "اختياري" : "Optional"}
                    </span>
                  </div>

                  <p className="mb-3 text-xs text-text-muted">
                    {isAr
                      ? "يمكن اختيار تخصص رئيسي وتخصصين فرعيين الآن، أو يكمّلها مقدم الخدمة لاحقاً."
                      : "You can select one main specialty and two sub-specialties now, or let the provider complete them later."}
                  </p>

                  <div className="mb-3">
                    <label className="mb-1.5 block text-xs font-bold text-text-muted">
                      {isAr ? "التخصص الرئيسي" : "Main Specialty"}
                    </label>
                    <select
                      value={selectedMainSpecialty}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSelectedMainSpecialty(value);
                        setSelectedSpecialties((prev) =>
                          prev.filter((item) => item !== value),
                        );
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    >
                      <option value="">
                        {isAr ? "اختر التخصص الرئيسي" : "Select main specialty"}
                      </option>
                      {specialtyOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[0, 1].map((index) => (
                      <div key={index}>
                        <label className="mb-1.5 block text-xs font-bold text-text-muted">
                          {isAr
                            ? index === 0
                              ? "التخصص الفرعي الأول"
                              : "التخصص الفرعي الثاني"
                            : index === 0
                              ? "First Sub-specialty"
                              : "Second Sub-specialty"}
                        </label>
                        <select
                          value={selectedSpecialties[index] ?? ""}
                          onChange={(event) =>
                            setSubSpecialtyAt(index, event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                        >
                          <option value="">
                            {isAr
                              ? "اختر التخصص الفرعي"
                              : "Select sub-specialty"}
                          </option>
                          {specialtyOptions.map((item) => (
                            <option
                              key={item.value}
                              value={item.value}
                              disabled={
                                selectedMainSpecialty === item.value ||
                                selectedSpecialties[index === 0 ? 1 : 0] ===
                                  item.value
                              }
                            >
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className={registerStep === 2 ? "space-y-6" : "hidden"}>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-text-primary">
                    {isAr ? "الصورة الشخصية" : "Profile Image"}
                  </label>
                  <input
                    id="profileImage"
                    name="profileImage"
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setProfileImageName(file?.name ?? "");
                      setProfileImagePreview(
                        file ? URL.createObjectURL(file) : null,
                      );
                    }}
                  />
                  <label
                    htmlFor="profileImage"
                    className="flex cursor-pointer items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-primary/30"
                  >
                    <div className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/10 bg-primary/[0.035] ring-4 ring-primary/[0.025]">
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
                          (isAr
                            ? "اضغط لتحميل الصورة الشخصية"
                            : "Click to upload profile image")}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        JPG, PNG, WEBP, HEIC, HEIF, GIF, AVIF
                      </p>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr ? "الاسم بالعربي *" : "Arabic Name *"}
                    </label>
                    <input
                      name="fullNameAr"
                      type="text"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
                      onChange={() => {
                        setFieldErrors((current) => {
                          const next = { ...current };
                          delete next.fullNameAr;
                          return next;
                        });
                      }}
                    />
                    {fieldErrors.fullNameAr && (
                      <p className="mt-1 text-xs font-bold text-red-600">
                        {fieldErrors.fullNameAr}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr ? "الاسم بالإنجليزي" : "English Name"}
                    </label>
                    <input
                      name="fullNameEn"
                      type="text"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr ? "البريد الإلكتروني *" : "Email *"}
                    </label>
                    <input
                      name="email"
                      type="email"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
                      onChange={() => {
                        setFieldErrors((current) => {
                          const next = { ...current };
                          delete next.email;
                          return next;
                        });
                      }}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs font-bold text-red-600">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr ? "رقم الهاتف / الواتساب *" : "Phone / WhatsApp *"}
                    </label>
                    <input
                      name="phone"
                      type="tel"
                      placeholder="973XXXXXXXX"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
                      onChange={() => {
                        setFieldErrors((current) => {
                          const next = { ...current };
                          delete next.phone;
                          return next;
                        });
                      }}
                    />
                    {fieldErrors.phone && (
                      <p className="mt-1 text-xs font-bold text-red-600">
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-text-primary">
                    {isAr ? "اللغة" : "Language"}
                  </label>
                  <select
                    name="language"
                    defaultValue=""
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="">
                      {isAr ? "اختر اللغة" : "Select language"}
                    </option>
                    {languages.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section className={registerStep === 3 ? "space-y-6" : "hidden"}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr
                        ? "رقم الرخصة / رقم القيد"
                        : "License / Registration Number"}
                    </label>
                    <input
                      name="licenseNumber"
                      type="text"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr ? "تاريخ انتهاء الرخصة" : "License Expiry Date"}
                    </label>
                    <input
                      name="licenseExpiryDate"
                      type="date"
                      min={todayDate}
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr ? "رقم الآيبان" : "IBAN Number"}
                    </label>
                    <input
                      name="ibanNumber"
                      type="text"
                      dir="ltr"
                      placeholder="BH..."
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr ? "ساعات العمل" : "Working Hours"}
                    </label>
                    <select
                      name="workingHours"
                      defaultValue=""
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
                    >
                      <option value="">
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
                  </div>
                </div>
              </section>

              <section className={registerStep === 4 ? "space-y-6" : "hidden"}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr ? "ملف الرخصة" : "License File"}
                    </label>
                    <input
                      id="licenseFile"
                      name="licenseFile"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(event) =>
                        setLicenseFileName(event.target.files?.[0]?.name ?? "")
                      }
                    />
                    <label
                      htmlFor="licenseFile"
                      className="block cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-8 text-center transition-colors hover:border-primary/30"
                    >
                      <Upload className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                      <p className="text-sm text-text-muted">
                        {licenseFileName ||
                          (isAr
                            ? "اضغط لتحميل ملف الرخصة"
                            : "Click to upload license file")}
                      </p>
                    </label>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr ? "شهادة الآيبان" : "IBAN Certificate"}
                    </label>
                    <input
                      id="ibanCertificateFile"
                      name="ibanCertificateFile"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(event) =>
                        setIbanCertificateFileName(
                          event.target.files?.[0]?.name ?? "",
                        )
                      }
                    />
                    <label
                      htmlFor="ibanCertificateFile"
                      className="block cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-8 text-center transition-colors hover:border-primary/30"
                    >
                      <Upload className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                      <p className="text-sm text-text-muted">
                        {ibanCertificateFileName ||
                          (isAr
                            ? "اضغط لتحميل شهادة الآيبان"
                            : "Click to upload IBAN certificate")}
                      </p>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-text-primary">
                    {isAr ? "رفع صورة التوقيع" : "Upload Signature Image"}
                  </label>
                  <input
                    id="signatureFile"
                    name="signatureFile"
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    className="hidden"
                    onChange={(event) =>
                      setSignatureFileName(event.target.files?.[0]?.name ?? "")
                    }
                  />
                  <label
                    htmlFor="signatureFile"
                    className="block cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-8 text-center transition-colors hover:border-primary/30"
                  >
                    <Upload className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                    <p className="text-sm text-text-muted">
                      {signatureFileName ||
                        (isAr
                          ? "اضغط لرفع صورة التوقيع"
                          : "Click to upload signature image")}
                    </p>
                  </label>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-text-primary">
                    {isAr ? "أو ارسم التوقيع" : "Or Draw Signature"}
                  </label>
                  <div className="rounded-xl border border-gray-200 bg-white p-2">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        className: "h-44 w-full rounded-lg bg-white",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => signatureRef.current?.clear()}
                    className="mt-2 text-xs font-bold text-red-600"
                  >
                    {isAr ? "مسح التوقيع" : "Clear signature"}
                  </button>
                </div>
              </section>

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {registerStep > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setRegisterStep((registerStep - 1) as RegisterStep)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-text-primary transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    {isAr ? "السابق" : "Previous"}
                  </button>
                )}

                {registerStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-dark"
                  >
                    {isAr ? "التالي" : "Next"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      if (submitting) return;
                      const form = event.currentTarget.form;
                      if (!form) return;
                      void runExplicitAdd("final-add-button", () =>
                        handleExplicitAdd(form),
                      );
                    }}
                    disabled={submitting}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {submitting
                      ? isAr
                        ? "جاري الإضافة..."
                        : "Adding..."
                      : isAr
                        ? "إضافة المحامي وإرسال الدعوة"
                        : "Add Lawyer and Send Invitation"}
                  </button>
                )}
              </div>
            </div>
          </form>

          {completionLink && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <h2 className="mb-2 text-sm font-extrabold text-emerald-800">
                {isAr
                  ? "تمت إضافة المحامي وإنشاء رابط الدعوة"
                  : "Lawyer added and invitation link created"}
              </h2>

              {inviteRecipientEmail && (
                <p className="mb-2 text-xs font-bold text-emerald-700">
                  {isAr ? "تم تجهيز الدعوة للبريد:" : "Invitation prepared for:"}{" "}
                  {inviteRecipientEmail}
                </p>
              )}

              <div className="break-all rounded-xl bg-white p-3 text-xs text-text-muted">
                {completionLink}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700"
                >
                  <Copy className="h-4 w-4" />
                  {isAr ? "نسخ الرابط" : "Copy Link"}
                </button>

                <button
                  type="button"
                  onClick={copyEmailHtml}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-text-primary hover:border-primary/30 hover:text-primary"
                >
                  <Copy className="h-4 w-4" />
                  {isAr ? "نسخ قالب HTML" : "Copy HTML Template"}
                </button>

                <button
                  type="button"
                  onClick={copyEmailText}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-text-primary hover:border-primary/30 hover:text-primary"
                >
                  <Copy className="h-4 w-4" />
                  {isAr ? "نسخ نص الإيميل" : "Copy Email Text"}
                </button>

                {!inviteEmailSent && (
                  <button
                    type="button"
                    onClick={sendInviteHtmlEmail}
                    disabled={sendingInviteEmail || !inviteRecipientEmail}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-text-primary hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Mail className="h-4 w-4" />
                    {sendingInviteEmail
                      ? isAr
                        ? "جاري إعادة الإرسال..."
                        : "Resending..."
                      : isAr
                        ? "إعادة إرسال الدعوة بالإيميل"
                        : "Resend invitation email"}
                  </button>
                )}

                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-text-primary hover:border-primary/30 hover:text-primary"
                  >
                    {isAr ? "إرسال واتساب" : "Send WhatsApp"}
                  </a>
                )}
              </div>

              {inviteEmailSent && (
                <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-extrabold leading-6 text-emerald-700">
                  {isAr
                    ? "تم إرسال دعوة الانضمام تلقائيًا إلى بريد المحامي."
                    : "The invitation to join was sent automatically to the lawyer."}
                </p>
              )}

              {inviteEmailError && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-extrabold leading-6 text-red-700">
                  {inviteEmailError}
                </p>
              )}

              <p className="mt-3 text-xs leading-6 text-emerald-800/80">
                {isAr
                  ? "ملاحظة: فتح القالب بتصميم HTML داخل تطبيق الإيميل غير مدعوم عبر mailto، لذلك هذا الزر يرسل القالب مباشرة من السيرفر ليصل للمستلم بنفس التصميم."
                  : "Note: opening an HTML-designed template inside the mail app is not supported through mailto, so this button sends the template directly from the server."}
              </p>

              <details className="mt-4 overflow-hidden rounded-xl border border-emerald-100 bg-white">
                <summary className="cursor-pointer px-4 py-3 text-xs font-extrabold text-emerald-800">
                  {isAr ? "معاينة قالب الإيميل" : "Preview email template"}
                </summary>
                <iframe
                  title={
                    isAr ? "معاينة قالب الإيميل" : "Email template preview"
                  }
                  srcDoc={inviteEmailHtml}
                  className="h-[720px] w-full border-0 bg-white"
                />
              </details>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
